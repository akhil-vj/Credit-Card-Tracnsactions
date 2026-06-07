import { useState } from "react";
import { RefreshCw, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/device-id";
import { analyzeScreenshot } from "@/lib/analyze.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function LibraryToolbar() {
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeScreenshot);
  const [resetMode, setResetMode] = useState<"txns" | "all">("txns");

  // Lightweight metadata-only query — does NOT load image_base64 (which can be
  // multi-megabyte per row). The full image is fetched on demand only when
  // re-analyzing.
  const { data: screenshots = [] } = useQuery({
    queryKey: ["screenshots-meta"],
    queryFn: async () => {
      const deviceId = getDeviceId();
      const { data, error } = await supabase
        .from("screenshots")
        .select("id, file_name, mime, created_at")
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const reanalyze = useMutation({
    mutationFn: async () => {
      const deviceId = getDeviceId();
      if (!screenshots.length) throw new Error("No saved screenshots to re-analyze");

      // Clear existing transactions for this device before re-running
      const { error: delErr } = await supabase
        .from("transactions")
        .delete()
        .eq("device_id", deviceId);
      if (delErr) throw delErr;

      let imported = 0;
      for (const shot of screenshots) {
        // Fetch the heavy base64 only for this one screenshot
        const { data: full, error: fetchErr } = await supabase
          .from("screenshots")
          .select("image_base64, file_name")
          .eq("id", shot.id)
          .single();
        if (fetchErr || !full) continue;
        const result = await analyze({
          data: { imageBase64: full.image_base64, mimeType: shot.mime },
        });
        if (!result.transactions.length) continue;
        const rows = result.transactions.map((t) => ({
          device_id: deviceId,
          screenshot_id: shot.id,
          txn_date: t.txn_date || null,
          description: t.description,
          merchant: t.merchant ?? null,
          category: t.category ?? null,
          amount: t.amount,
          type: t.type,
          is_hidden_charge: t.is_hidden_charge ?? false,
          charge_reason: t.charge_reason ?? null,
          tax_amount: t.tax_amount ?? 0,
          emi_total_months: t.emi_total_months ?? null,
          emi_paid_months: t.emi_paid_months ?? (t.emi_total_months ? 0 : null),
          emi_monthly_amount: t.emi_monthly_amount ?? null,
          emi_interest_rate: t.emi_interest_rate ?? null,
          card_account: t.card_account ?? null,
          source_screenshot: shot.file_name,
          raw: t as unknown as never,
        }));
        const { error } = await supabase.from("transactions").insert(rows);
        if (error) throw error;
        imported += rows.length;
        await supabase
          .from("screenshots")
          .update({ last_analyzed_at: new Date().toISOString() })
          .eq("id", shot.id);
      }
      return imported;
    },
    onSuccess: (count) => {
      toast.success(`Re-analyzed ${screenshots.length} screenshot${screenshots.length === 1 ? "" : "s"} → ${count} transactions`);
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = useMutation({
    mutationFn: async (mode: "txns" | "all") => {
      const deviceId = getDeviceId();
      const { error: txErr } = await supabase
        .from("transactions")
        .delete()
        .eq("device_id", deviceId);
      if (txErr) throw txErr;
      if (mode === "all") {
        const { error: shErr } = await supabase
          .from("screenshots")
          .delete()
          .eq("device_id", deviceId);
        if (shErr) throw shErr;
      }
      return mode;
    },
    onSuccess: (mode) => {
      toast.success(mode === "all" ? "Everything cleared" : "Transactions cleared");
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["screenshots"] });
      qc.invalidateQueries({ queryKey: ["screenshots-meta"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = reanalyze.isPending || reset.isPending;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/40 p-4 shadow-card">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ImageIcon className="h-4 w-4 text-gold" />
        <span>
          <span className="font-semibold text-foreground">{screenshots.length}</span> saved screenshot{screenshots.length === 1 ? "" : "s"} in your library
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={busy || !screenshots.length}
          onClick={() => reanalyze.mutate()}
        >
          {reanalyze.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh analysis
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => setResetMode("txns")}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset your data?</AlertDialogTitle>
              <AlertDialogDescription>
                Choose what to clear. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="flex flex-col gap-2 py-2 text-sm">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:border-primary">
                <input
                  type="radio"
                  name="reset-mode"
                  className="mt-1"
                  checked={resetMode === "txns"}
                  onChange={() => setResetMode("txns")}
                />
                <div>
                  <div className="font-medium">Clear transactions only</div>
                  <div className="text-xs text-muted-foreground">Keeps your screenshot library so you can re-analyze later.</div>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:border-destructive">
                <input
                  type="radio"
                  name="reset-mode"
                  className="mt-1"
                  checked={resetMode === "all"}
                  onChange={() => setResetMode("all")}
                />
                <div>
                  <div className="font-medium">Clear everything</div>
                  <div className="text-xs text-muted-foreground">Deletes transactions and all saved screenshots.</div>
                </div>
              </label>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => reset.mutate(resetMode)}>
                {reset.isPending ? "Clearing…" : "Confirm reset"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
