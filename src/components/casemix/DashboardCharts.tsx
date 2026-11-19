import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatRp, formatShort, totals, upgradeStats, type Patient } from "@/lib/casemix";
function Chart({
  title,
  total,
  children,
}: {
  title: string;
  total: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-border-soft bg-surface p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold">{title}</h3>
        <span className="text-xs text-muted-foreground">{total}</span>
      </div>
      <div className="h-[260px]">{children}</div>
    </section>
  );
}
const colors = ["var(--primary)", "var(--secondary)", "var(--chart-3)", "var(--chart-4)"];
export function DashboardCharts({ rows }: { rows: Patient[] }) {
  const t = totals(rows);
  const u = upgradeStats(rows);
  const dates = [...new Set(rows.map((p) => p.tanggal))].sort();
  const line = dates.map((date) => {
    const v = totals(rows.filter((p) => p.tanggal === date));
    return { date, pendapatan: v.totalPendapatan, billing: v.billing };
  });
  const dpjp = [...new Set(rows.map((p) => p.dpjp || "Tanpa DPJP"))].map((name) => ({
    name,
    count: rows.filter((p) => (p.dpjp || "Tanpa DPJP") === name).length,
  }));
  const costs = [
    { name: "SDM", value: t.sdm },
    { name: "Operasional", value: t.ops },
    { name: "Investasi", value: t.investasi },
  ];
  const donut = (data: { name: string; value: number }[]) => (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data.filter((p) => p.value > 0)}
          dataKey="value"
          innerRadius="55%"
          outerRadius="80%"
          isAnimationActive={false}
        >
          {data.map((p, i) => (
            <Cell key={p.name} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => formatRp(v)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Chart title="Tren Pendapatan vs Billing" total={formatRp(t.totalPendapatan)}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={line}>
            <CartesianGrid stroke="var(--border-soft)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={formatShort} width={55} />
            <Tooltip formatter={(v: number) => formatRp(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              dataKey="pendapatan"
              name="Pendapatan"
              stroke="var(--primary)"
              strokeWidth={3}
              isAnimationActive={false}
            />
            <Line
              dataKey="billing"
              name="Billing"
              stroke="var(--secondary)"
              strokeWidth={3}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Chart>
      <Chart title="Komposisi Biaya" total={formatRp(t.sdm + t.ops + t.investasi)}>
        {donut(costs)}
      </Chart>
      <Chart title="Pasien per DPJP" total={`${t.count} pasien`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dpjp}>
            <CartesianGrid stroke="var(--border-soft)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} width={30} />
            <Tooltip />
            <Bar
              dataKey="count"
              name="Pasien"
              fill="var(--primary)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </Chart>
      <Chart title="Naik Kelas Biasa vs COB" total={formatRp(u.income)}>
        {donut(u.mix)}
      </Chart>
    </div>
  );
}
