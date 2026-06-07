import { createFileRoute } from "@tanstack/react-router";
import { HiddenChargesOnly } from "@/components/HiddenCharges";
import { useTransactions } from "@/lib/use-transactions";

export const Route = createFileRoute("/hidden-charges")({
  head: () => ({
    meta: [
      { title: "Hidden charges — Vault" },
      { name: "description", content: "Fees, surcharges and interest the bank slipped in." },
    ],
  }),
  component: HiddenChargesPage,
});

function HiddenChargesPage() {
  const { data: txns = [] } = useTransactions();
  return (
    <main className="mx-auto max-w-6xl">
      <HiddenChargesOnly txns={txns} />
    </main>
  );
}
