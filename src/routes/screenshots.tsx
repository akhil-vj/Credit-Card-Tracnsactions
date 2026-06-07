import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Loader2, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/device-id";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/screenshots")({
  head: () => ({
    meta: [
      { title: "Screenshots — Vault" },
      { name: "description", content: "View and delete saved screenshots." },
    ],
  }),
  component: ScreenshotsPage,
});

type Shot = {
  id: string;
  file_name: string | null;
  mime: string;
  image_base64: string;
  created_at: string;
};

function ScreenshotsPage() {
  const qc = useQueryClient();
  const { data: shots = [], isLoading } = useQuery({
    queryKey: ["screenshots"],
    queryFn: async () => {
      const deviceId = getDeviceId();
      const { data, error } = await supabase
        .from("screenshots")
        .select("id, file_name, mime, image_base64, created_at")
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Shot[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const deviceId = getDeviceId();
      // Delete transactions linked to this screenshot first
      const { error: txErr } = await supabase
        .from("transactions")
        .delete()
        .eq("device_id", deviceId)
        .eq("screenshot_id", id);
      if (txErr) throw txErr;
      const { error } = await supabase
        .from("screenshots")
        .delete()
        .eq("device_id", deviceId)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Screenshot and its transactions deleted");
      qc.invalidateQueries({ queryKey: ["screenshots"] });
      qc.invalidateQueries({ queryKey: ["screenshots-meta"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="mx-auto max-w-6xl space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Screenshots</h1>
          <p className="text-sm text-muted-foreground">
            {shots.length} saved · deleting one removes its extracted transactions
          </p>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : !shots.length ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 py-16 text-muted-foreground">
          <ImageOff className="h-8 w-8" />
          <p>No screenshots yet. Upload some from the dashboard.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {shots.map((s) => (
            <div
              key={s.id}
              className="group relative overflow-hidden rounded-xl border border-border bg-card/40 shadow-card"
            >
              <img
                src={`data:${s.mime};base64,${s.image_base64}`}
                alt={s.file_name ?? "screenshot"}
                className="aspect-[3/4] w-full object-cover"
                loading="lazy"
              />
              <div className="space-y-1 p-3 text-xs">
                <div className="truncate font-medium" title={s.file_name ?? ""}>
                  {s.file_name ?? "screenshot"}
                </div>
                <div className="text-muted-foreground">
                  {new Date(s.created_at).toLocaleString()}
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute right-2 top-2 h-8 w-8 opacity-90"
                    disabled={del.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete screenshot?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This deletes the screenshot and any transactions extracted
                      from it. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => del.mutate(s.id)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
