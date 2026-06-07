import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { type Transaction, type TxnType } from "@/lib/transactions";
import { getDeviceId } from "@/lib/device-id";

const TYPES: TxnType[] = ["spend", "repayment", "cashback", "charge", "refund"];

export function TransactionForm({
  txn,
  onClose,
}: {
  txn?: Transaction | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Transaction>>({
    txn_date: "",
    description: "",
    merchant: "",
    category: "",
    amount: 0,
    type: "spend",
    is_hidden_charge: false,
    charge_reason: "",
    tax_amount: 0,
    emi_total_months: 0,
    emi_paid_months: 0,
    emi_monthly_amount: 0,
    emi_interest_rate: 0,
    card_account: "",
    notes: "",
  });

  useEffect(() => {
    if (txn) {
      setFormData({ ...txn });
    }
  }, [txn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const deviceId = getDeviceId();
      const payload: any = {
        ...formData,
        device_id: deviceId,
      };

      // Clean up empty numbers
      if (!payload.tax_amount) payload.tax_amount = null;
      if (!payload.emi_total_months) payload.emi_total_months = null;
      if (!payload.emi_paid_months) payload.emi_paid_months = null;
      if (!payload.emi_monthly_amount) payload.emi_monthly_amount = null;
      if (!payload.emi_interest_rate) payload.emi_interest_rate = null;

      if (txn?.id) {
        const { error } = await supabase.from("transactions").update(payload).eq("id", txn.id);
        if (error) throw error;
        toast.success("Transaction updated");
      } else {
        const { error } = await supabase.from("transactions").insert([payload]);
        if (error) throw error;
        toast.success("Transaction added");
      }

      qc.invalidateQueries({ queryKey: ["transactions"] });
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    if (type === "number") finalValue = value === "" ? "" : Number(value);
    if (type === "checkbox") finalValue = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({ ...prev, [name]: finalValue }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display text-lg font-semibold">{txn ? "Edit Transaction" : "Add Transaction"}</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-accent text-muted-foreground transition">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 max-h-[80vh] overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <input type="date" name="txn_date" value={formData.txn_date || ""} onChange={handleChange} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Amount (₹) *</label>
              <input type="number" step="0.01" required name="amount" value={formData.amount || ""} onChange={handleChange} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Description *</label>
            <input type="text" required name="description" value={formData.description || ""} onChange={handleChange} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Merchant</label>
              <input type="text" name="merchant" value={formData.merchant || ""} onChange={handleChange} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <input type="text" name="category" value={formData.category || ""} onChange={handleChange} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <select name="type" value={formData.type || "spend"} onChange={handleChange} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Card / Account</label>
            <input type="text" name="card_account" value={formData.card_account || ""} onChange={handleChange} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>

          <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="is_hidden_charge" checked={formData.is_hidden_charge || false} onChange={handleChange} className="rounded border-border" />
              <span className="text-sm font-medium text-warning">Is Hidden Charge?</span>
            </label>
            {formData.is_hidden_charge && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Charge Reason</label>
                  <input type="text" name="charge_reason" value={formData.charge_reason || ""} onChange={handleChange} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Tax Amount (₹)</label>
                  <input type="number" step="0.01" name="tax_amount" value={formData.tax_amount || ""} onChange={handleChange} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
             <span className="text-sm font-medium text-primary block">EMI Details</span>
             <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Total Months</label>
                  <input type="number" name="emi_total_months" value={formData.emi_total_months || ""} onChange={handleChange} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Paid Months</label>
                  <input type="number" name="emi_paid_months" value={formData.emi_paid_months || ""} onChange={handleChange} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Monthly Amount</label>
                  <input type="number" step="0.01" name="emi_monthly_amount" value={formData.emi_monthly_amount || ""} onChange={handleChange} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-muted-foreground uppercase">Interest Rate (%)</label>
                  <input type="number" step="0.01" name="emi_interest_rate" value={formData.emi_interest_rate || ""} onChange={handleChange} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
             </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea name="notes" rows={2} value={formData.notes || ""} onChange={handleChange} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"></textarea>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm hover:bg-accent transition">Cancel</button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition">
              <Check className="h-4 w-4" />
              {loading ? "Saving..." : "Save Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
