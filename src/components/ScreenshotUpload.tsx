import { useEffect, useRef, useState } from "react";
import { Upload, Loader2, Sparkles, ClipboardPaste } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { analyzeScreenshot } from "@/lib/analyze.functions";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/device-id";
import { fileSha256 } from "@/lib/hash";

function fileToBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [meta, b64] = result.split(",");
      const mime = meta.match(/data:(.*?);/)?.[1] ?? file.type ?? "image/png";
      resolve({ base64: b64, mime });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ScreenshotUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const analyze = useServerFn(analyzeScreenshot);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (files: FileList) => {
      const deviceId = getDeviceId();
      let imported = 0;

      for (const file of Array.from(files)) {
        const originalHash = await fileSha256(file);
        const hash = `${originalHash}-${crypto.randomUUID()}`;
        const { base64, mime } = await fileToBase64(file);

        const { data: shot, error: shotErr } = await supabase
          .from("screenshots")
          .insert({
            device_id: deviceId,
            hash,
            file_name: file.name,
            mime,
            image_base64: base64,
          })
          .select("id")
          .single();
        if (shotErr) throw shotErr;

        // Process sequentially to respect the strict 15 RPM free tier limit
        const result = await analyze({ data: { imageBase64: base64, mimeType: mime } });
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
          source_screenshot: file.name,
          raw: t as unknown as never,
        }));
        
        const { error } = await supabase.from("transactions").insert(rows);
        if (error) throw error;
        
        qc.invalidateQueries({ queryKey: ["transactions"] });
        qc.invalidateQueries({ queryKey: ["screenshots"] });
        qc.invalidateQueries({ queryKey: ["screenshots-meta"] });
        toast.success(`Imported ${rows.length} transactions from ${file.name}`);
        
        imported += rows.length;
      }

      return { imported, count: files.length };
    },
    onSuccess: ({ imported, count }) => {
      if (imported === 0) toast.info("No transactions detected in any images");
      else if (count > 1) toast.success(`Finished analyzing all ${count} images!`);
    },
    onError: (e: Error) => toast.error(e.message),

  });

  const handle = (files: FileList | null) => {
    if (!files || !files.length) return;
    mutation.mutate(files);
  };

  const handlePastedItems = (items: DataTransferItemList | null) => {
    if (!items) return false;
    const dt = new DataTransfer();
    for (const item of Array.from(items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const f = item.getAsFile();
        if (f) dt.items.add(f);
      }
    }
    if (!dt.files.length) return false;
    mutation.mutate(dt.files);
    return true;
  };

  const [pasteFocused, setPasteFocused] = useState(false);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!pasteFocused) return;
      if (handlePastedItems(e.clipboardData?.items ?? null)) e.preventDefault();
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [pasteFocused]);

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`group relative cursor-pointer rounded-2xl border-2 border-dashed bg-card-gradient p-10 text-center transition-all shadow-card hover:ring-gold ${
          dragging ? "border-primary ring-gold" : "border-border"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handle(e.target.files)}
        />
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-gold">
          {mutation.isPending ? <Loader2 className="h-7 w-7 animate-spin text-primary-foreground" /> : <Upload className="h-7 w-7 text-primary-foreground" />}
        </div>
        <h3 className="mt-4 text-2xl font-semibold">
          {mutation.isPending ? "Reading your statement…" : "Drop screenshots here"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          SMS alerts, statement pages, Axis / Flipkart app screens — drop or click to upload.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 text-xs text-gold">
          <Sparkles className="h-3.5 w-3.5" />
          AI auto-detects spends, repayments, cashbacks & hidden charges
        </div>
      </div>

      <div
        tabIndex={0}
        onFocus={() => setPasteFocused(true)}
        onBlur={() => setPasteFocused(false)}
        onPaste={(e) => {
          if (handlePastedItems(e.clipboardData.items)) e.preventDefault();
        }}
        onClick={(e) => (e.currentTarget as HTMLDivElement).focus()}
        className={`flex cursor-text items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-4 text-sm outline-none transition-all ${
          pasteFocused ? "border-primary ring-gold bg-card/60" : "border-border bg-card/30 text-muted-foreground"
        }`}
      >
        <ClipboardPaste className="h-4 w-4" />
        {pasteFocused
          ? "Now press Ctrl/Cmd + V to paste your screenshot"
          : "Click here, then paste an image (Ctrl/Cmd + V)"}
      </div>
    </div>
  );
}
