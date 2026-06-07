import { createFileRoute } from "@tanstack/react-router";
import { CardHero } from "@/components/CardHero";
import { ScreenshotUpload } from "@/components/ScreenshotUpload";
import { StatCards } from "@/components/StatCards";
import { CategoryChart } from "@/components/CategoryChart";
import { EmiTracker } from "@/components/EmiTracker";
import { useTransactions } from "@/lib/use-transactions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Vault" },
      { name: "description", content: "Snapshot of spends, repayments and EMIs on your Flipkart Axis credit card." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: txns = [] } = useTransactions();
  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <CardHero txns={txns} />
        <ScreenshotUpload />
      </section>
      <StatCards txns={txns} />
      <section className="grid gap-6 lg:grid-cols-2">
        <CategoryChart txns={txns} />
        <EmiTracker txns={txns} />
      </section>
    </main>
  );
}
