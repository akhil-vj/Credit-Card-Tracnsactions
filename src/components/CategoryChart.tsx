import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { Transaction } from "@/lib/transactions";
import { fmtINR, getActiveTxnsForStats } from "@/lib/transactions";

const COLORS = ["#d4a82c", "#e85d3a", "#6ba3c8", "#87a878", "#c9a0dc", "#f0d78c", "#a0522d", "#5cbdb9"];

export function CategoryChart({ txns }: { txns: Transaction[] }) {
  const activeTxns = getActiveTxnsForStats(txns);
  const byCat = new Map<string, number>();
  for (const t of activeTxns) {
    if (t.type !== "spend" || t.is_hidden_charge) continue;
    const k = t.category || "Other";
    byCat.set(k, (byCat.get(k) ?? 0) + Number(t.amount));
  }
  const data = Array.from(byCat.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="rounded-2xl bg-card-gradient p-5 shadow-card">
      <h3 className="font-display text-xl">Spend by category</h3>
      {data.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">No spends yet.</p>
      ) : (
        <div className="mt-4 h-72">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "oklch(0.18 0.012 60)", border: "1px solid oklch(0.28 0.012 60)", borderRadius: 8 }}
                formatter={(v: number) => fmtINR(v)}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
