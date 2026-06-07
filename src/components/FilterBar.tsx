import { Search, X } from "lucide-react";
import type { Filters, Transaction } from "@/lib/transactions";
import { uniqueValues } from "@/lib/transactions";

const STATUS_OPTIONS = [
  { v: "", label: "All status" },
  { v: "spend", label: "Spends" },
  { v: "repayment", label: "Paid" },
  { v: "cashback", label: "Cashbacks" },
  { v: "charge", label: "Charges" },
  { v: "refund", label: "Refunds" },
  { v: "emi", label: "EMI only" },
  { v: "hidden", label: "Hidden only" },
];

const SORT_OPTIONS = [
  { v: "date_desc", label: "Newest" },
  { v: "date_asc", label: "Oldest" },
  { v: "amount_desc", label: "Amount ↓" },
  { v: "amount_asc", label: "Amount ↑" },
];

export function FilterBar({
  filters,
  onChange,
  txns,
  onReset,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  txns: Transaction[];
  onReset: () => void;
}) {
  const merchants = uniqueValues(txns, "merchant");
  const cards = uniqueValues(txns, "card_account");
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v });

  const select =
    "rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 p-4">
      <div className="relative min-w-[180px] flex-1">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={filters.q}
          onChange={(e) => set("q", e.target.value)}
          placeholder="Search merchant, note, category…"
          className="h-8 w-full rounded-md border border-border bg-background pl-7 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <input
        type="date"
        value={filters.from}
        onChange={(e) => set("from", e.target.value)}
        className={select}
        title="From date"
      />
      <span className="text-xs text-muted-foreground">→</span>
      <input
        type="date"
        value={filters.to}
        onChange={(e) => set("to", e.target.value)}
        className={select}
        title="To date"
      />

      <select value={filters.merchant} onChange={(e) => set("merchant", e.target.value)} className={select}>
        <option value="">All merchants</option>
        {merchants.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <select value={filters.card} onChange={(e) => set("card", e.target.value)} className={select}>
        <option value="">All cards</option>
        {cards.length === 0 && <option disabled>(no card tags yet)</option>}
        {cards.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select value={filters.status} onChange={(e) => set("status", e.target.value)} className={select}>
        {STATUS_OPTIONS.map((s) => (
          <option key={s.v} value={s.v}>
            {s.label}
          </option>
        ))}
      </select>

      <select value={filters.sort} onChange={(e) => set("sort", e.target.value as Filters["sort"])} className={select}>
        {SORT_OPTIONS.map((s) => (
          <option key={s.v} value={s.v}>
            {s.label}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
        <input 
          type="checkbox" 
          checked={filters.showIgnored} 
          onChange={(e) => set("showIgnored", e.target.checked)} 
          className="rounded border-border accent-primary" 
        />
        Show Hidden
      </label>

      <button
        onClick={onReset}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="h-3 w-3" />
        Reset
      </button>
    </div>
  );
}
