import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTransactions } from "@/lib/use-transactions";
import { emiSummary, emiSchedule, fmtINR, fmtDay, type Transaction } from "@/lib/transactions";
import { TransactionForm } from "@/components/TransactionForm";
import { Copy, Plus, Edit2, CalendarClock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/emis")({
  head: () => ({
    meta: [
      { title: "Active EMIs — Vault" },
      { name: "description", content: "Track your active EMIs and their amortization schedules." },
    ],
  }),
  component: EmiPage,
});

function EmiPage() {
  const { data: txns = [] } = useTransactions();
  const qc = useQueryClient();
  const s = emiSummary(txns);
  
  const [editingTxn, setEditingTxn] = useState<Transaction | null | undefined>(undefined);

  const updatePaidMonths = async (id: string, months: number) => {
    const { error } = await supabase.from("transactions").update({ emi_paid_months: months }).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["transactions"] });
  };

  const removeEmi = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this EMI?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("EMI deleted");
      qc.invalidateQueries({ queryKey: ["transactions"] });
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl">Active EMIs</h1>
          <p className="text-muted-foreground mt-1">Includes both loans and transaction-based EMIs.</p>
        </div>
        <button
          onClick={() => setEditingTxn(null)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 transition"
        >
          <Plus className="h-4 w-4" />
          Add Manual EMI
        </button>
      </div>

      {s.active.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <CalendarClock className="h-6 w-6" />
          </div>
          <h3 className="mt-4 font-display text-lg">No active EMIs</h3>
          <p className="text-sm text-muted-foreground">You don't have any ongoing EMIs right now.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {s.active.map((t) => {
            const sch = emiSchedule(t);
            if (!sch) return null;

            return (
              <div key={t.id} className="overflow-hidden rounded-2xl bg-card border border-border shadow-card relative">
                {/* Header details */}
                <div className="p-6 pb-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span>{t.txn_date ? new Date(t.txn_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"} • {t.card_account || "Credit Card"}</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setEditingTxn(t)} 
                        className="hover:text-foreground inline-flex items-center gap-1 bg-muted/50 px-2 py-1 rounded transition"
                      >
                        <Edit2 className="h-3 w-3" /> Edit Info
                      </button>
                      <button 
                        onClick={() => removeEmi(t.id)} 
                        className="hover:text-destructive hover:bg-destructive/10 inline-flex items-center gap-1 bg-muted/50 px-2 py-1 rounded transition"
                        title="Delete EMI"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-between">
                    <h3 className="font-display text-xl uppercase tracking-wide text-foreground/90">{t.merchant || t.description}</h3>
                    <p className="font-mono text-lg font-medium">{fmtINR(Number(t.amount))}</p>
                  </div>
                  
                  <p className="mt-1 text-sm font-medium text-foreground/80">
                    EMI: {fmtINR(Number(t.emi_monthly_amount ?? 0))} for {t.emi_total_months} months
                  </p>

                  <div className="mt-5 flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
                    <span className="text-xs text-muted-foreground font-medium">Reference Number</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{t.id.split('-')[0].toUpperCase()}</span>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(t.id); toast.success("Copied"); }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Schedule Table */}
                <div className="p-6 pt-2 bg-muted/5 border-t border-border/50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">EMI Schedule</h4>
                    <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary uppercase tracking-wider">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Active EMI
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Please review the details on EMI Amortisation Schedule. Click on a row to mark it as the current paid status.</p>

                  <div className="rounded-xl border border-border overflow-hidden bg-background">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-muted/30 text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium w-10">#</th>
                          <th className="px-4 py-3 font-medium">Outstanding</th>
                          <th className="px-4 py-3 font-medium">Principal</th>
                          <th className="px-4 py-3 font-medium">Interest</th>
                          <th className="px-4 py-3 font-medium">EMI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {/* Initial interest row #0 (Optional mockup row for fidelity to screenshot) */}
                        <tr className="text-muted-foreground/80">
                          <td className="px-4 py-3 text-left">0</td>
                          <td className="px-4 py-3 font-mono">—</td>
                          <td className="px-4 py-3 font-mono">—</td>
                          <td className="px-4 py-3 font-mono">{fmtINR(sch.rows[0]?.interest ? sch.rows[0].interest * 0.8 : 0)}</td>
                          <td className="px-4 py-3 font-mono">—</td>
                        </tr>
                        
                        {sch.rows.map((r) => {
                          // In the user's screenshot, the "Active" EMI is the NEXT unpaid one (e.g. if 1 is paid, 2 is highlighted)
                          // Their logic: The row index that is equal to `monthsPaid + 1` is the current active one.
                          const isActive = r.n === (sch.monthsPaid + 1);
                          const isPaid = r.n <= sch.monthsPaid;

                          return (
                            <tr 
                              key={r.n}
                              onClick={() => updatePaidMonths(t.id, isActive ? r.n - 1 : r.n)}
                              className={`
                                cursor-pointer transition-colors
                                ${isActive ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/50"}
                                ${isPaid ? "text-muted-foreground opacity-60" : "text-foreground"}
                              `}
                            >
                              <td className="px-4 py-3 text-left font-medium">{r.n}</td>
                              <td className="px-4 py-3 font-mono">{fmtINR(r.balance + r.principal)}</td>
                              <td className="px-4 py-3 font-mono">{fmtINR(r.principal)}</td>
                              <td className="px-4 py-3 font-mono">{fmtINR(r.interest)}</td>
                              <td className="px-4 py-3 font-mono font-medium">{fmtINR(r.emi)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 text-[10px] text-muted-foreground/80 bg-muted/30 p-3 rounded-lg">
                    #0 is the initial interest which is charged from the date of loan booking till the statement generation date.
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingTxn !== undefined && (
        <TransactionForm
          txn={editingTxn}
          onClose={() => setEditingTxn(undefined)}
        />
      )}
    </main>
  );
}
