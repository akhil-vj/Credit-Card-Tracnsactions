import { fmtINR, getActiveTxnsForStats } from "@/lib/transactions";
import type { Transaction } from "@/lib/transactions";
import { useCardSettings } from "@/lib/use-card-settings";

export function CardHero({ txns }: { txns: Transaction[] }) {
  const { settings } = useCardSettings();
  const activeTxns = getActiveTxnsForStats(txns);

  const spends = activeTxns.filter((t) => t.type === "spend" && !t.is_hidden_charge).reduce((s, t) => s + Number(t.amount), 0);
  const repayments = activeTxns.filter((t) => t.type === "repayment").reduce((s, t) => s + Number(t.amount), 0);
  const cashbacks = activeTxns.filter((t) => t.type === "cashback").reduce((s, t) => s + Number(t.amount), 0);
  const hidden = activeTxns.filter((t) => t.is_hidden_charge || t.type === "charge").reduce((s, t) => s + Number(t.amount), 0);
  
  const outstanding = spends + hidden - repayments - cashbacks;
  const availableLimit = settings.totalLimit ? Math.max(0, settings.totalLimit - outstanding) : null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[oklch(0.22_0.02_60)] via-[oklch(0.16_0.012_50)] to-[oklch(0.12_0.01_40)] p-7 shadow-gold ring-gold">
      <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gradient-to-br from-primary/40 to-transparent blur-2xl" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-gold/80">{settings.bankName}</p>
          <h2 className="mt-1 font-display text-2xl">Credit Card</h2>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Outstanding</p>
          <p className="font-mono text-2xl font-semibold text-gradient-gold">{fmtINR(outstanding)}</p>
        </div>
      </div>
      
      <div className="relative mt-8 flex items-end justify-between">
        <p className="font-mono tracking-[0.4em] text-foreground/70 text-lg">{settings.cardNumber}</p>
        {settings.totalLimit && (
          <div className="text-right text-xs">
            <p className="text-muted-foreground mb-1"><span className="text-foreground/50">Total Limit:</span> {fmtINR(settings.totalLimit)}</p>
            <p className="font-semibold text-primary"><span className="text-muted-foreground font-normal">Available:</span> {fmtINR(availableLimit!)}</p>
          </div>
        )}
      </div>

      <div className="relative mt-6 grid grid-cols-3 gap-4 text-xs">
        <div>
          <p className="text-muted-foreground">Spends</p>
          <p className="mt-1 font-mono text-sm">{fmtINR(spends)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Paid</p>
          <p className="mt-1 font-mono text-sm text-success">{fmtINR(repayments)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Cashback</p>
          <p className="mt-1 font-mono text-sm text-gold">{fmtINR(cashbacks)}</p>
        </div>
      </div>
    </div>
  );
}
