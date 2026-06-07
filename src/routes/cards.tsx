import { createFileRoute } from "@tanstack/react-router";
import { useCardSettings } from "@/lib/use-card-settings";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CreditCard, Save } from "lucide-react";

export const Route = createFileRoute("/cards")({
  head: () => ({
    meta: [
      { title: "Card Settings — Vault" },
      { name: "description", content: "Manage your credit card details and limits." },
    ],
  }),
  component: CardPage,
});

function CardPage() {
  const { settings, saveSettings } = useCardSettings();
  const [bankName, setBankName] = useState(settings.bankName);
  const [cardNumber, setCardNumber] = useState(settings.cardNumber);
  const [totalLimit, setTotalLimit] = useState(settings.totalLimit?.toString() || "");

  // Update local state when settings load from localStorage
  useEffect(() => {
    setBankName(settings.bankName);
    setCardNumber(settings.cardNumber);
    setTotalLimit(settings.totalLimit?.toString() || "");
  }, [settings]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = cardNumber.replace(/[^0-9]/g, "").slice(-4);
    const formattedCard = digits ? `•••• •••• •••• ${digits}` : "•••• •••• •••• ••••";
    
    saveSettings({
      bankName: bankName.trim() || "Credit Card",
      cardNumber: formattedCard,
      totalLimit: totalLimit ? Number(totalLimit) : null,
    });
    toast.success("Card settings saved!");
  };

  return (
    <main className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Card Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your card limit and details.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <form onSubmit={handleSave} className="space-y-6">
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Bank & Card Name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Flipkart · Axis Bank"
                className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1.5">Card Number (Last 4 Digits)</label>
              <div className="flex items-center rounded-lg border border-border bg-background px-3 focus-within:ring-2 focus-within:ring-primary/50">
                <span className="text-muted-foreground mr-2 font-mono tracking-[0.2em]">•••• •••• ••••</span>
                <input
                  type="text"
                  maxLength={4}
                  value={cardNumber.replace(/[^0-9]/g, "").slice(-4)} // Just show the digits
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="9901"
                  className="w-full bg-transparent py-3 text-sm font-mono focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Total Credit Limit (₹)</label>
              <input
                type="number"
                value={totalLimit}
                onChange={(e) => setTotalLimit(e.target.value)}
                placeholder="e.g. 100000"
                min="0"
                className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-muted-foreground mt-1.5">This will be used to calculate your Available Limit automatically.</p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-opacity hover:opacity-90"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
