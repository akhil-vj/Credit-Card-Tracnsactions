import { createFileRoute } from "@tanstack/react-router";
import { TransactionList } from "@/components/TransactionList";
import { useTransactions } from "@/lib/use-transactions";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — Vault" },
      { name: "description", content: "Search, filter and correct every extracted transaction." },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const { data: txns = [] } = useTransactions();
  return (
    <main className="mx-auto max-w-6xl">
      <TransactionList txns={txns} />
    </main>
  );
}
