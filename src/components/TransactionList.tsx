import { useState } from "react";
import {
  Trash2,
  AlertTriangle,
  CalendarClock,
  StickyNote,
  Check,
  X,
  CreditCard,
  Eye,
  EyeOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  type Transaction,
  type TxnType,
  type Filters,
  fmtINR,
  fmtDay,
  applyFilters,
  defaultFilters,
} from "@/lib/transactions";
import { FilterBar } from "@/components/FilterBar";
import { TransactionForm } from "@/components/TransactionForm";
import { Plus, Edit2 } from "lucide-react";

const typeStyles: Record<string, string> = {
  spend: "text-destructive",
  repayment: "text-success",
  cashback: "text-gold",
  charge: "text-warning",
  refund: "text-success",
};

const typeBadge: Record<string, string> = {
  spend: "bg-destructive/15 text-destructive",
  repayment: "bg-success/15 text-success",
  cashback: "bg-gold/15 text-gold",
  charge: "bg-warning/15 text-warning",
  refund: "bg-success/15 text-success",
};

const TYPES: TxnType[] = ["spend", "repayment", "cashback", "charge", "refund"];

export function TransactionList({ txns }: { txns: Transaction[] }) {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [openNote, setOpenNote] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState("");
  const [editingTxn, setEditingTxn] = useState<Transaction | null | undefined>(undefined);

  const filtered = applyFilters(txns, filters);

  const remove = async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["transactions"] });
    }
  };

  const changeType = async (id: string, type: TxnType) => {
    const { error } = await supabase.from("transactions").update({ type }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Marked as ${type}`);
      qc.invalidateQueries({ queryKey: ["transactions"] });
    }
  };

  const saveNote = async (id: string) => {
    const value = draftNote.trim() || null;
    const { error } = await supabase.from("transactions").update({ notes: value }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Note saved");
      setOpenNote(null);
      qc.invalidateQueries({ queryKey: ["transactions"] });
    }
  };

  return (
    <div className="rounded-2xl bg-card-gradient shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-border p-5">
        <div className="flex items-center gap-4">
          <h3 className="font-display text-xl">Transactions</h3>
          <button
            onClick={() => setEditingTxn(null)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Manual
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {filtered.length} of {txns.length} shown
        </p>
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        txns={txns}
        onReset={() => setFilters(defaultFilters)}
      />

      {filtered.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          {txns.length === 0 ? "No transactions yet." : "No transactions match these filters."}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((t) => {
            const tax = Number(t.tax_amount ?? 0);
            const isEmi = !!t.emi_total_months;
            const isOpen = openNote === t.id;
            const hasNote = !!t.notes?.trim();
            return (
              <li key={t.id} className="hover:bg-accent/30">
                <div className="flex items-center gap-3 p-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${typeBadge[t.type]}`}>
                    {t.is_hidden_charge ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : isEmi ? (
                      <CalendarClock className="h-4 w-4" />
                    ) : (
                      <span className="text-xs font-semibold uppercase">{t.type[0]}</span>
                    )}
                  </div>

                  <div className="w-16 shrink-0 text-center">
                    <p className="font-mono text-sm font-semibold whitespace-nowrap">{fmtDay(t.txn_date)}</p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate font-medium">{t.merchant || t.description}</p>
                      {t.is_hidden_charge && (
                        <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
                          Hidden
                        </span>
                      )}
                      {isEmi && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                          EMI · {t.emi_paid_months ?? 0}/{t.emi_total_months}
                        </span>
                      )}
                      {tax > 0 && (
                        <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold">
                          GST {fmtINR(tax)}
                        </span>
                      )}
                      {t.card_account && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          <CreditCard className="h-2.5 w-2.5" />
                          {t.card_account}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.category || t.description.slice(0, 60)}
                      {t.charge_reason ? ` · ${t.charge_reason}` : ""}
                      {isEmi && t.emi_monthly_amount ? ` · ${fmtINR(Number(t.emi_monthly_amount))}/mo` : ""}
                    </p>
                  </div>

                  <select
                    value={t.type}
                    onChange={(e) => changeType(t.id, e.target.value as TxnType)}
                    className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-xs capitalize text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {TYPES.map((tp) => (
                      <option key={tp} value={tp}>
                        {tp}
                      </option>
                    ))}
                  </select>

                  <div className={`w-24 text-right font-mono text-sm font-semibold ${typeStyles[t.type]}`}>
                    {t.type === "spend" || t.type === "charge" ? "−" : "+"}
                    {fmtINR(Number(t.amount))}
                  </div>

                  <button
                    onClick={() => {
                      if (isOpen) setOpenNote(null);
                      else {
                        setDraftNote(t.notes ?? "");
                        setOpenNote(t.id);
                      }
                    }}
                    title={hasNote ? "Edit note" : "Add note"}
                    className={`rounded-md p-2 transition ${
                      hasNote
                        ? "text-gold hover:bg-gold/10"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <StickyNote className="h-4 w-4" />
                  </button>

                  <button
                    onClick={async () => {
                      const isIgnored = typeof t.raw === "object" && t.raw !== null && (t.raw as any).is_ignored === true;
                      const newRaw = { ...(typeof t.raw === "object" ? t.raw : {}), is_ignored: !isIgnored };
                      await supabase.from("transactions").update({ raw: newRaw }).eq("id", t.id);
                      qc.invalidateQueries({ queryKey: ["transactions"] });
                      toast.success(isIgnored ? "Transaction restored" : "Transaction hidden");
                    }}
                    className={`rounded-md p-2 transition ${
                      typeof t.raw === "object" && t.raw !== null && (t.raw as any).is_ignored === true
                        ? "text-muted-foreground bg-muted/50 hover:bg-muted"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                    title={typeof t.raw === "object" && t.raw !== null && (t.raw as any).is_ignored === true ? "Restore transaction" : "Hide transaction"}
                  >
                    {(typeof t.raw === "object" && t.raw !== null && (t.raw as any).is_ignored === true) ? (
                      <EyeOff className="h-4 w-4 opacity-50" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    onClick={() => setEditingTxn(t)}
                    className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition"
                    title="Edit transaction"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => remove(t.id)}
                    className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                    title="Delete transaction"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {(isOpen || hasNote) && (
                  <div className="px-4 pb-4 pl-[4.75rem]">
                    {isOpen ? (
                      <div className="rounded-lg border border-border bg-background/60 p-3">
                        <textarea
                          autoFocus
                          value={draftNote}
                          onChange={(e) => setDraftNote(e.target.value)}
                          rows={2}
                          placeholder="Add context, correction, or a reminder…"
                          className="w-full resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            onClick={() => setOpenNote(null)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            <X className="h-3 w-3" /> Cancel
                          </button>
                          <button
                            onClick={() => saveNote(t.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
                          >
                            <Check className="h-3 w-3" /> Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="rounded-md border-l-2 border-gold/60 bg-gold/5 px-3 py-2 text-xs italic text-foreground/80">
                        “{t.notes}”
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editingTxn !== undefined && (
        <TransactionForm
          txn={editingTxn}
          onClose={() => setEditingTxn(undefined)}
        />
      )}
    </div>
  );
}
