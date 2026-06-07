import { AlertTriangle, Receipt } from "lucide-react";
import { type Transaction, fmtINR, fmtDay, totalTax } from "@/lib/transactions";

export function HiddenChargesOnly({ txns }: { txns: Transaction[] }) {
  const items = txns.filter((t) => t.is_hidden_charge);
  const total = items.reduce((s, t) => s + Number(t.amount), 0);
  return (
    <div className="rounded-2xl border border-warning/30 bg-card-gradient p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/15 text-warning">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-display text-xl">Hidden charges</h3>
          <p className="text-xs text-muted-foreground">Fees, surcharges and interest the bank slipped in.</p>
        </div>
        <div className="ml-auto font-mono text-lg font-semibold text-warning">{fmtINR(total)}</div>
      </div>
      {items.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">No hidden charges spotted yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg bg-warning/5 px-3 py-2 text-sm">
              <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">{fmtDay(t.txn_date)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.merchant || t.description}</p>
                <p className="truncate text-xs text-muted-foreground">{t.charge_reason || t.description}</p>
              </div>
              <span className="font-mono text-warning">{fmtINR(Number(t.amount))}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TaxOnly({ txns }: { txns: Transaction[] }) {
  const items = txns.filter((t) => t.is_hidden_charge);
  const taxRows = items
    .filter((t) => /gst|tax|igst|cgst|sgst/i.test(`${t.charge_reason ?? ""} ${t.description}`))
    .map((t) => ({ id: t.id, label: t.charge_reason || "GST", date: t.txn_date, amount: Number(t.amount) }));
  const embeddedTax = txns
    .filter((t) => Number(t.tax_amount ?? 0) > 0)
    .map((t) => ({
      id: `${t.id}-tax`,
      label: `GST on ${t.merchant || t.description.slice(0, 24)}`,
      date: t.txn_date,
      amount: Number(t.tax_amount),
    }));
  const allTax = [...taxRows, ...embeddedTax];
  const taxTotal = totalTax(txns) + taxRows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="rounded-2xl border border-gold/30 bg-card-gradient p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-gold">
          <Receipt className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-display text-xl">GST / Tax</h3>
          <p className="text-xs text-muted-foreground">Tax components, isolated so you see exactly what's tax.</p>
        </div>
        <div className="ml-auto font-mono text-lg font-semibold text-gold">{fmtINR(taxTotal)}</div>
      </div>
      {allTax.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">No tax lines detected yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {allTax.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg bg-gold/5 px-3 py-2 text-sm">
              <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">{fmtDay(r.date)}</span>
              <p className="min-w-0 flex-1 truncate font-medium">{r.label}</p>
              <span className="font-mono text-gold">{fmtINR(r.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function HiddenCharges({ txns }: { txns: Transaction[] }) {
  const items = txns.filter((t) => t.is_hidden_charge);
  const total = items.reduce((s, t) => s + Number(t.amount), 0);

  // GST / tax: dedicated standalone tax rows + embedded tax_amount on other txns
  const taxRows = items
    .filter((t) => /gst|tax|igst|cgst|sgst/i.test(`${t.charge_reason ?? ""} ${t.description}`))
    .map((t) => ({ id: t.id, label: t.charge_reason || "GST", date: t.txn_date, amount: Number(t.amount) }));
  const embeddedTax = txns
    .filter((t) => Number(t.tax_amount ?? 0) > 0)
    .map((t) => ({
      id: `${t.id}-tax`,
      label: `GST on ${t.merchant || t.description.slice(0, 24)}`,
      date: t.txn_date,
      amount: Number(t.tax_amount),
    }));
  const allTax = [...taxRows, ...embeddedTax];
  const taxTotal = totalTax(txns) + taxRows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-warning/30 bg-card-gradient p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/15 text-warning">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-xl">Hidden charges</h3>
            <p className="text-xs text-muted-foreground">Fees, surcharges and interest the bank slipped in.</p>
          </div>
          <div className="ml-auto font-mono text-lg font-semibold text-warning">{fmtINR(total)}</div>
        </div>

        {items.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">No hidden charges spotted yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {items.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg bg-warning/5 px-3 py-2 text-sm">
                <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">{fmtDay(t.txn_date)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.merchant || t.description}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.charge_reason || t.description}</p>
                </div>
                <span className="font-mono text-warning">{fmtINR(Number(t.amount))}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-gold/30 bg-card-gradient p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-gold">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-xl">GST / Tax</h3>
            <p className="text-xs text-muted-foreground">Tax components, isolated so you see exactly what's tax.</p>
          </div>
          <div className="ml-auto font-mono text-lg font-semibold text-gold">{fmtINR(taxTotal)}</div>
        </div>

        {allTax.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">No tax lines detected yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {allTax.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg bg-gold/5 px-3 py-2 text-sm">
                <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">{fmtDay(r.date)}</span>
                <p className="min-w-0 flex-1 truncate font-medium">{r.label}</p>
                <span className="font-mono text-gold">{fmtINR(r.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
