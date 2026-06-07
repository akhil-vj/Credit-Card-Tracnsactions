import type { Transaction } from "@/lib/transactions";
import { getActiveTxnsForStats } from "@/lib/transactions";
import { ArrowDownRight, ArrowUpRight, Gift, AlertTriangle, Wallet } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export function StatCards({ txns }: { txns: Transaction[] }) {
  const activeTxns = getActiveTxnsForStats(txns);

  const spends = activeTxns.filter((t) => t.type === "spend" && !t.is_hidden_charge).reduce((s, t) => s + Number(t.amount), 0);
  const repayments = activeTxns.filter((t) => t.type === "repayment").reduce((s, t) => s + Number(t.amount), 0);
  const cashbacks = activeTxns.filter((t) => t.type === "cashback").reduce((s, t) => s + Number(t.amount), 0);
  const hidden = activeTxns.filter((t) => t.is_hidden_charge || t.type === "charge").reduce((s, t) => s + Number(t.amount), 0);
  
  const outstanding = spends + hidden - repayments - cashbacks;

  const cards = [
    { label: "Total spends", value: fmt(spends), icon: ArrowUpRight, tone: "text-destructive" },
    { label: "Repayments", value: fmt(repayments), icon: ArrowDownRight, tone: "text-success" },
    { label: "Cashbacks earned", value: fmt(cashbacks), icon: Gift, tone: "text-gold" },
    { label: "Hidden charges", value: fmt(hidden), icon: AlertTriangle, tone: "text-warning" },
    { label: "Outstanding (est.)", value: fmt(outstanding), icon: Wallet, tone: outstanding > 0 ? "text-destructive" : "text-success" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl bg-card-gradient p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</span>
            <c.icon className={`h-4 w-4 ${c.tone}`} />
          </div>
          <div className="mt-3 font-display text-2xl md:text-3xl font-semibold">{c.value}</div>
        </div>
      ))}
    </div>
  );
}
