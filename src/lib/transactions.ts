import type { Tables } from "@/integrations/supabase/types";

export type Transaction = Tables<"transactions">;
export type TxnType = "spend" | "repayment" | "cashback" | "charge" | "refund";

export const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

export const fmtDay = (d: string | null | undefined) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

// -------- EMI amortization --------

export type EmiScheduleRow = {
  n: number;
  emi: number;
  interest: number;
  principal: number;
  balance: number;
  paid: boolean;
};

export type EmiSchedule = {
  principal: number;
  totalInterest: number;
  totalCost: number;
  monthsTotal: number;
  monthsPaid: number;
  monthsLeft: number;
  paidPrincipal: number;
  paidInterest: number;
  totalPaidSoFar: number;
  remainingBalance: number;
  remainingInterest: number;
  rows: EmiScheduleRow[];
};

export function emiSchedule(t: Transaction): EmiSchedule | null {
  const months = Number(t.emi_total_months ?? 0);
  const emi = Number(t.emi_monthly_amount ?? 0);
  if (!months || !emi) return null;

  const paid = Math.max(0, Math.min(months, Number(t.emi_paid_months ?? 0)));
  const annual = Number(t.emi_interest_rate ?? 0);
  const i = annual > 0 ? annual / 12 / 100 : 0;

  const principal = i > 0 ? (emi * (1 - Math.pow(1 + i, -months))) / i : emi * months;

  let balance = principal;
  let paidPrincipal = 0;
  let paidInterest = 0;
  const rows: EmiScheduleRow[] = [];

  for (let n = 1; n <= months; n++) {
    const interest = balance * i;
    const princPart = Math.min(balance, emi - interest);
    balance = Math.max(0, balance - princPart);
    const isPaid = n <= paid;
    if (isPaid) {
      paidPrincipal += princPart;
      paidInterest += interest;
    }
    rows.push({ n, emi, interest, principal: princPart, balance, paid: isPaid });
  }

  const totalCost = emi * months;
  const totalInterest = Math.max(0, totalCost - principal);
  return {
    principal,
    totalInterest,
    totalCost,
    monthsTotal: months,
    monthsPaid: paid,
    monthsLeft: months - paid,
    paidPrincipal,
    paidInterest,
    totalPaidSoFar: emi * paid,
    remainingBalance: Math.max(0, principal - paidPrincipal),
    remainingInterest: Math.max(0, totalInterest - paidInterest),
    rows,
  };
}

export type EmiSummary = {
  totalPrincipal: number;
  totalPaid: number;
  totalRemaining: number;
  monthlyOutflow: number;
  maxMonthsLeft: number;
  active: Transaction[];
};

export function emiSummary(txns: Transaction[]): EmiSummary {
  const active = txns.filter(
    (t) => t.type === "spend" && t.emi_total_months && t.emi_monthly_amount,
  );
  let totalPrincipal = 0;
  let totalPaid = 0;
  let monthlyOutflow = 0;
  let maxMonthsLeft = 0;
  for (const t of active) {
    const s = emiSchedule(t);
    if (!s) continue;
    totalPrincipal += s.principal;
    totalPaid += s.totalPaidSoFar;
    monthlyOutflow += Number(t.emi_monthly_amount ?? 0);
    maxMonthsLeft = Math.max(maxMonthsLeft, s.monthsLeft);
  }
  return {
    totalPrincipal,
    totalPaid,
    totalRemaining: Math.max(0, totalPrincipal - totalPaid),
    monthlyOutflow,
    maxMonthsLeft,
    active,
  };
}

export const totalTax = (txns: Transaction[]) =>
  txns.reduce((s, t) => s + Number(t.tax_amount ?? 0), 0);

export const getActiveTxnsForStats = (txns: Transaction[]) => {
  return txns.filter((t) => {
    const isIgnored = typeof t.raw === "object" && t.raw !== null && (t.raw as any).is_ignored === true;
    return !isIgnored;
  });
};

// -------- Filters --------

export type Filters = {
  q: string;
  from: string; // YYYY-MM-DD
  to: string;
  merchant: string; // "" = all
  card: string; // "" = all
  status: string; // "" = all, or txn type, "hidden", "emi"
  sort: "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
  showIgnored: boolean;
};

export const defaultFilters: Filters = {
  q: "",
  from: "",
  to: "",
  merchant: "",
  card: "",
  status: "",
  sort: "date_desc",
  showIgnored: false,
};

export function applyFilters(txns: Transaction[], f: Filters): Transaction[] {
  const q = f.q.trim().toLowerCase();
  const from = f.from ? new Date(f.from).getTime() : -Infinity;
  const to = f.to ? new Date(f.to).getTime() + 86_400_000 : Infinity;

  const filtered = txns.filter((t) => {
    const isIgnored = typeof t.raw === "object" && t.raw !== null && (t.raw as any).is_ignored === true;
    if (isIgnored && !f.showIgnored) return false;

    if (q) {
      const hay = `${t.merchant ?? ""} ${t.description ?? ""} ${t.category ?? ""} ${t.notes ?? ""} ${t.charge_reason ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.merchant && (t.merchant ?? "") !== f.merchant) return false;
    if (f.card && (t.card_account ?? "") !== f.card) return false;
    if (f.status) {
      if (f.status === "hidden" && !t.is_hidden_charge) return false;
      else if (f.status === "emi" && !t.emi_total_months) return false;
      else if (!["hidden", "emi"].includes(f.status) && t.type !== f.status) return false;
    }
    if (t.txn_date) {
      const ts = new Date(t.txn_date).getTime();
      if (ts < from || ts > to) return false;
    } else if (f.from || f.to) {
      return false;
    }
    return true;
  });

  return filtered.sort((a, b) => {
    if (f.sort === "amount_desc") return Number(b.amount) - Number(a.amount);
    if (f.sort === "amount_asc") return Number(a.amount) - Number(b.amount);
    
    // Sort by Date (Ignoring Year as per user request)
    let timeA = 0;
    if (a.txn_date) {
      const dA = new Date(a.txn_date);
      if (!isNaN(dA.getTime())) {
        dA.setFullYear(2026);
        timeA = dA.getTime();
      }
    }
    
    let timeB = 0;
    if (b.txn_date) {
      const dB = new Date(b.txn_date);
      if (!isNaN(dB.getTime())) {
        dB.setFullYear(2026);
        timeB = dB.getTime();
      }
    }
    
    // If times are the same (or both null), sort by created_at to keep it stable
    if (timeA === timeB) {
      const createdA = new Date(a.created_at).getTime();
      const createdB = new Date(b.created_at).getTime();
      return f.sort === "date_asc" ? createdA - createdB : createdB - createdA;
    }

    if (f.sort === "date_asc") {
      // Ascending: old dates first, nulls (0) at the very top
      return timeA - timeB;
    } else {
      // Descending (default): new dates first. Put nulls (0) at the very bottom!
      // If timeA is 0, it should be greater than timeB so a is placed after b.
      if (timeA === 0) return 1;
      if (timeB === 0) return -1;
      return timeB - timeA;
    }
  });
}

export function uniqueValues(txns: Transaction[], key: "merchant" | "card_account"): string[] {
  const set = new Set<string>();
  for (const t of txns) {
    const v = t[key];
    if (v) set.add(v);
  }
  return Array.from(set).sort();
}
