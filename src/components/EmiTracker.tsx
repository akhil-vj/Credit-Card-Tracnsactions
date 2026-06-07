import { useMemo, useState } from "react";
import { CalendarClock, ChevronDown, ChevronUp, Coins, Percent } from "lucide-react";
import { emiSchedule, emiSummary, fmtINR, type Transaction } from "@/lib/transactions";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function EmiTracker({ txns }: { txns: Transaction[] }) {
  const qc = useQueryClient();
  const s = emiSummary(txns);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const update = async (
    id: string,
    patch: { emi_paid_months?: number; emi_interest_rate?: number | null },
  ) => {
    setBusy(id);
    const { error } = await supabase.from("transactions").update(patch).eq("id", id);
    setBusy(null);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["transactions"] });
  };

  const totals = useMemo(() => {
    let principal = 0;
    let interest = 0;
    let paidInterest = 0;
    let paidPrincipal = 0;
    for (const t of s.active) {
      const sch = emiSchedule(t);
      if (!sch) continue;
      principal += sch.principal;
      interest += sch.totalInterest;
      paidInterest += sch.paidInterest;
      paidPrincipal += sch.paidPrincipal;
    }
    return { principal, interest, paidInterest, paidPrincipal };
  }, [s.active]);

  return (
    <div className="rounded-2xl bg-card-gradient p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-display text-xl">EMI breakdown</h3>
          <p className="text-xs text-muted-foreground">Principal vs interest, paid so far & per-installment balance.</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
        <Stat label="Remaining" value={fmtINR(s.totalRemaining)} tone="text-destructive" icon={Coins} />
        <Stat label="Per month" value={fmtINR(s.monthlyOutflow)} tone="text-foreground" icon={Coins} />
        <Stat label="Interest cost" value={fmtINR(totals.interest)} tone="text-warning" icon={Percent} />
        <Stat label="Months left" value={s.maxMonthsLeft ? `${s.maxMonthsLeft} mo` : "—"} tone="text-gold" icon={CalendarClock} />
      </div>

      {/* Stacked progress: principal paid vs interest paid vs remaining */}
      {(totals.principal + totals.interest) > 0 && (
        <div className="mt-4 space-y-1">
          <div className="flex h-2 overflow-hidden rounded-full bg-border">
            <Bar value={totals.paidPrincipal} total={totals.principal + totals.interest} cls="bg-primary" />
            <Bar value={totals.paidInterest} total={totals.principal + totals.interest} cls="bg-warning" />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>
              Paid principal {fmtINR(totals.paidPrincipal)} · paid interest {fmtINR(totals.paidInterest)}
            </span>
            <span>of {fmtINR(totals.principal + totals.interest)} total</span>
          </div>
        </div>
      )}

      {s.active.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">No EMI conversions detected yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {s.active.map((t) => {
            const sch = emiSchedule(t);
            if (!sch) return null;
            const isOpen = openId === t.id;
            const pct = sch.monthsTotal > 0 ? Math.min(100, (sch.monthsPaid / sch.monthsTotal) * 100) : 0;
            return (
              <li key={t.id} className="rounded-lg bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{t.merchant || t.description}</p>
                  <p className="font-mono text-xs text-muted-foreground">{fmtINR(Number(t.emi_monthly_amount ?? 0))}/mo</p>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                  <div className="h-full bg-gradient-to-r from-primary to-gold" style={{ width: `${pct}%` }} />
                </div>

                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground md:grid-cols-4">
                  <span>Principal · <span className="font-mono text-foreground">{fmtINR(sch.principal)}</span></span>
                  <span>Interest · <span className="font-mono text-warning">{fmtINR(sch.totalInterest)}</span></span>
                  <span>Paid · <span className="font-mono text-foreground">{fmtINR(sch.totalPaidSoFar)} ({sch.monthsPaid}/{sch.monthsTotal})</span></span>
                  <span>Remaining · <span className="font-mono text-destructive">{fmtINR(sch.remainingBalance + sch.remainingInterest)}</span></span>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    Rate (% p.a.)
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      defaultValue={t.emi_interest_rate ?? ""}
                      disabled={busy === t.id}
                      onBlur={(e) => {
                        const v = e.target.value === "" ? null : Number(e.target.value);
                        if (v !== (t.emi_interest_rate ?? null)) update(t.id, { emi_interest_rate: v });
                      }}
                      className="w-16 rounded-md border border-border bg-background px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </label>

                  <div className="flex items-center gap-1">
                    <button
                      disabled={busy === t.id || sch.monthsPaid === 0}
                      onClick={() => update(t.id, { emi_paid_months: Math.max(0, sch.monthsPaid - 1) })}
                      className="rounded-md bg-muted px-2 py-0.5 text-xs hover:bg-accent disabled:opacity-40"
                    >
                      −1
                    </button>
                    <button
                      disabled={busy === t.id || sch.monthsPaid >= sch.monthsTotal}
                      onClick={() => update(t.id, { emi_paid_months: Math.min(sch.monthsTotal, sch.monthsPaid + 1) })}
                      className="rounded-md bg-primary/20 px-2 py-0.5 text-xs text-primary hover:bg-primary/30 disabled:opacity-40"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => setOpenId(isOpen ? null : t.id)}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs hover:bg-accent"
                    >
                      Schedule
                      {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-3 max-h-72 overflow-auto rounded-md border border-border bg-background/40">
                    <table className="w-full text-[11px]">
                      <thead className="sticky top-0 bg-card text-muted-foreground">
                        <tr>
                          <th className="px-2 py-1 text-left">#</th>
                          <th className="px-2 py-1 text-right">EMI</th>
                          <th className="px-2 py-1 text-right">Interest</th>
                          <th className="px-2 py-1 text-right">Principal</th>
                          <th className="px-2 py-1 text-right">Balance left</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sch.rows.map((r) => (
                          <tr
                            key={r.n}
                            className={r.paid ? "text-muted-foreground line-through" : "text-foreground"}
                          >
                            <td className="px-2 py-1">{r.n}</td>
                            <td className="px-2 py-1 text-right font-mono">{fmtINR(r.emi)}</td>
                            <td className="px-2 py-1 text-right font-mono text-warning/80">{fmtINR(r.interest)}</td>
                            <td className="px-2 py-1 text-right font-mono text-primary/80">{fmtINR(r.principal)}</td>
                            <td className="px-2 py-1 text-right font-mono">{fmtINR(r.balance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Bar({ value, total, cls }: { value: number; total: number; cls: string }) {
  const w = total > 0 ? (value / total) * 100 : 0;
  return <div className={cls} style={{ width: `${w}%` }} />;
}

function Stat({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg bg-muted/30 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 inline-flex items-center gap-1 font-mono text-sm font-semibold ${tone}`}>
        <Icon className="h-3 w-3 opacity-60" />
        {value}
      </p>
    </div>
  );
}
