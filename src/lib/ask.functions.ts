import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { emiSummary } from "./transactions";

const AskSchema = z.object({
  question: z.string().min(1),
  txns: z.any(),
  settings: z.any().optional(),
});

export const askAi = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AskSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY missing. Get it from Google AI Studio.");

    // Minify transactions to save prompt context window
    const validTxns = Array.isArray(data.txns) ? data.txns.filter(t => {
      const isIgnored = typeof t.raw === "object" && t.raw !== null && (t.raw as any).is_ignored === true;
      return !isIgnored;
    }) : [];
    
    // Calculate exact math so the LLM doesn't hallucinate
    const spends = validTxns.filter(t => t.type === "spend" && !t.is_hidden_charge).reduce((s, t) => s + Number(t.amount), 0);
    const repayments = validTxns.filter(t => t.type === "repayment").reduce((s, t) => s + Number(t.amount), 0);
    const cashbacks = validTxns.filter(t => t.type === "cashback").reduce((s, t) => s + Number(t.amount), 0);
    const hidden = validTxns.filter(t => (t.is_hidden_charge || t.type === "charge")).reduce((s, t) => s + Number(t.amount), 0);
    const outstanding = spends + hidden - repayments - cashbacks;

    const s = emiSummary(validTxns as any);
    let totalLeftInstallments = 0;
    for (const t of s.active) {
      totalLeftInstallments += ((t.emi_total_months || 0) - (t.emi_paid_months || 0)) * (t.emi_monthly_amount || 0);
    }

    const minified = validTxns.map(t => ({
      d: t.txn_date,
      a: t.amount,
      m: t.merchant || t.description,
      t: t.type,
      h: t.is_hidden_charge ? 1 : 0,
      e: t.emi_total_months ? 1 : 0,
      em: t.emi_monthly_amount || 0,
      et: t.emi_total_months || 0,
      ep: t.emi_paid_months || 0
    }));

    const limitInfo = data.settings?.totalLimit ? `\n- User's Total Credit Limit: INR ${data.settings.totalLimit}\n- User's Available Limit (Calculated as Total Limit - Outstanding): INR ${Math.max(0, data.settings.totalLimit - outstanding).toFixed(2)}` : "";

    const promptText = `You are a helpful financial AI assistant. You answer questions about a user's credit card transactions.
Data format (JSON array of objects):
d = Date (YYYY-MM-DD)
a = Amount in INR
m = Merchant or Description
t = Type (spend, repayment, cashback, charge)
h = 1 if it's a hidden fee/charge, 0 otherwise
e = 1 if this transaction is an active EMI, 0 otherwise
em = Monthly EMI installment amount (if e=1)
et = Total months of the EMI (if e=1)
ep = Number of months already paid (if e=1). To find remaining months: et - ep.

FORMATTING RULE: ALWAYS format large numbers with commas using the Indian numbering system (e.g., "23,400" or "1,20,500" or "₹23,400"). Never output large numbers without commas.

EXACT PRE-CALCULATED MATH (Use this if the user asks for totals! DO NOT calculate this yourself!):
- Total Dashboard Outstanding Balance: INR ${outstanding.toFixed(2)} (Derived from Spends + Hidden Charges - Repayments - Cashbacks)
- Total Spends: INR ${spends.toFixed(2)}
- Total Repayments: INR ${repayments.toFixed(2)}
- Total Cashbacks: INR ${cashbacks.toFixed(2)}
- Total Hidden Charges: INR ${hidden.toFixed(2)}
- Total Remaining EMI Principal: INR ${s.totalRemaining.toFixed(2)}
- Total Remaining EMI Installments left to pay: INR ${totalLeftInstallments.toFixed(2)}${limitInfo}

User's Data:
${JSON.stringify(minified)}

User Question: ${data.question}

Answer the user directly and concisely. Give exactly the information requested without fluff. If the data is not available, say so.`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.1,
        }
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini API Error:", err);
      throw new Error(`AI error: ${res.status}`);
    }

    const payload = await res.json();
    return payload.candidates?.[0]?.content?.parts?.[0]?.text || "No answer provided.";
  });
