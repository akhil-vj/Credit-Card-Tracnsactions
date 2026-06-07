import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  imageBase64: z.string().min(50),
  mimeType: z.string().default("image/png"),
});

const TxnSchema = z.object({
  txn_date: z.string().nullable().optional(),
  description: z.string().catch("Unknown transaction"),
  merchant: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  amount: z.any().transform(v => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const parsed = parseFloat(v.replace(/[^0-9.-]+/g, ""));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }),
  type: z.string().transform(v => {
    const l = v.toLowerCase();
    if (["spend", "repayment", "cashback", "charge", "refund"].includes(l)) return l;
    if (l.includes("pay") || l.includes("cr")) return "repayment";
    if (l.includes("fee") || l.includes("tax") || l.includes("gst")) return "charge";
    return "spend";
  }),
  is_hidden_charge: z.boolean().optional().default(false),
  charge_reason: z.string().nullable().optional(),
  tax_amount: z.number().nullable().optional(),
  emi_total_months: z.number().int().nullable().optional(),
  emi_paid_months: z.number().int().nullable().optional(),
  emi_monthly_amount: z.number().nullable().optional(),
  emi_interest_rate: z.number().nullable().optional(),
  card_account: z.string().nullable().optional(),
});

export type ExtractedTxn = z.infer<typeof TxnSchema>;

const SYSTEM_PROMPT = `You are an elite financial data extraction AI. You are looking at a screenshot (could be a bank statement, SMS, app screenshot, bill, or receipt).

Your goal is to extract EVERY SINGLE financial transaction, money movement, or bill. DO NOT SKIP ANY. Even if it looks slightly incomplete, extract what you can. 

CRITICAL EXTRACTION RULES:
1. DEBIT vs CREDIT: Pay close attention to colors (Red = spend/debit, Green = repayment/cashback/credit), signs (+/-), and markers (Cr/Dr). 
2. MERCHANT NAMES: Clean up the raw description to extract the actual merchant. If the raw text is "POS*ZOMATO*GURGAON", set description to the raw text but set merchant strictly to "ZOMATO".
3. MULTI-LINE TEXT: Sometimes a transaction spans multiple lines (e.g. merchant name on one line, location on the next). Combine them logically.
4. IGNORE BALANCES: Do not extract "Total Due", "Available Credit", or "Current Balance" as transactions. Only extract actual money movements or explicit fees.

Classify each transaction as one of the following exact strings:
- "spend"     -> purchase / debit / EMI principal charged
- "repayment" -> bill paid / payment received / "Cr"
- "cashback"  -> cashback / reward credit
- "charge"    -> bank fees: interest, late fee, GST, finance charge, surcharge, markup, convenience fee, annual fee, over-limit
- "refund"    -> merchant refunds

is_hidden_charge=true ONLY for fee-like items the user likely missed (GST, interest, late fee, surcharge, fuel surcharge, markup, convenience fee, over-limit, annual fee). Always set charge_reason then.

TAX: If a line shows GST / IGST / CGST / SGST / service tax embedded inside another transaction, set tax_amount to that rupee value on THAT transaction (do not duplicate it as a separate row). For a standalone GST charge row, set type="charge", is_hidden_charge=true, charge_reason="GST", and tax_amount=amount.

EMI: If the transaction is an EMI conversion / EMI installment / "converted to EMI", populate:
- emi_total_months (tenure in months)
- emi_paid_months (installments already paid; 0 if unknown / just converted)
- emi_monthly_amount (EMI per month in INR)
- emi_interest_rate (ANNUAL interest rate in percent, e.g. 14 for 14% p.a. — set null if not visible)
Use type="spend" for the whole EMI principal when it first appears; use the per-installment amount as amount when the screenshot only shows the monthly EMI debit.

CARD: When the screenshot identifies which card / account the line belongs to (e.g. "Flipkart Axis ••1234", "Axis Magnus", "HDFC Millennia"), set card_account to that short label. Else null.

Amount ALWAYS positive (strip ₹ and commas).

DATE PARSING (IMPORTANT — Indian screenshots often hide the year):
- Always output ISO YYYY-MM-DD in txn_date when ANY day+month is visible.
- Accept partial forms: "31 May", "31-May", "31/05", "May 31", "31 May 24", "31 May'24", "31/05/24", "31-05-2024".
- If the YEAR is missing, assume the CURRENT year (${new Date().getFullYear()}). If that would place the date more than 60 days in the FUTURE relative to today, use the previous year instead.
- If the year is 2-digit (e.g. "24"), expand to 20YY.
- Only set txn_date=null when NO day or month is visible at all.

Return STRICT JSON matching exactly: { "transactions": [...] }. 
CRITICAL: Do NOT wrap the JSON in markdown blocks like \`\`\`json. Output ONLY the raw JSON object starting with { and ending with }. No other prose.`;

export const analyzeScreenshot = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY missing. Get it from Groq Console.");

    let res: Response | null = null;
    let retries = 3;
    let delay = 6000;

    while (retries >= 0) {
      res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: SYSTEM_PROMPT + "\n\nExtract all credit card transactions from this screenshot. Output ONLY raw JSON.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${data.mimeType || "image/png"};base64,${data.imageBase64}`,
                  },
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (res.ok) break;

      const isRateLimit = res.status === 429;
      if (isRateLimit && retries > 0) {
        retries--;
        console.warn(`Groq Rate limit hit. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 1.5; 
      } else {
        const body = await res.text();
        console.error("Final Groq API Error:", body);
        throw new Error(`Groq API error ${res.status}: ${body.slice(0, 500)}`);
      }
    }

    if (!res) throw new Error("Failed to connect to Groq API");

    const payload = await res.json();
    let content: string = payload.choices?.[0]?.message?.content ?? "{}";
    
    // Safety cleanup in case the AI adds markdown or prose
    content = content.trim();
    if (content.startsWith("```json")) content = content.replace(/^```json/, "");
    if (content.startsWith("```")) content = content.replace(/^```/, "");
    if (content.endsWith("```")) content = content.replace(/```$/, "");
    content = content.trim();

    let parsed: { transactions?: unknown };
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI output as JSON:", content);
      throw new Error("AI returned invalid JSON");
    }
    const arr = Array.isArray(parsed.transactions) ? parsed.transactions : [];
    const txns: ExtractedTxn[] = [];
    for (const item of arr) {
      const r = TxnSchema.safeParse(item);
      if (r.success) {
        txns.push(r.data);
      } else {
        console.warn("Dropped a transaction due to parsing failure:", r.error, item);
      }
    }
    return { transactions: txns };
  });
