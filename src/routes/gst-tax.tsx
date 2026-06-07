import { createFileRoute } from "@tanstack/react-router";
import { TaxOnly } from "@/components/HiddenCharges";
import { useTransactions } from "@/lib/use-transactions";

export const Route = createFileRoute("/gst-tax")({
  head: () => ({
    meta: [
      { title: "GST / Tax — Vault" },
      { name: "description", content: "Every tax line on your card, isolated and totalled." },
    ],
  }),
  component: GstTaxPage,
});

function GstTaxPage() {
  const { data: txns = [] } = useTransactions();
  return (
    <main className="mx-auto max-w-6xl">
      <TaxOnly txns={txns} />
    </main>
  );
}
