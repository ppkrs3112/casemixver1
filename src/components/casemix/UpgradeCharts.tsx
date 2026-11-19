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
import { formatPct, formatRp, formatShort, upgradeStats } from "@/lib/casemix";
type Stats = ReturnType<typeof upgradeStats>;
const orange = "var(--chart-2)",
  magenta = "var(--chart-1)";
function Frame({
  title,
  children,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  empty: boolean;
}) {
  return (
    <section className="min-w-0 border-t border-border-soft py-4">
      <h3 className="mb-4 font-bold">{title}</h3>
      {empty ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Belum ada data naik kelas.
        </div>
      ) : (
        children
      )}
    </section>
  );
}
export function UpgradeCharts({ s }: { s: Stats }) {
  return (
    <div className="grid gap-x-6 md:grid-cols-2">
      <Frame title="Rute Naik Kelas" empty={!s.routes.length}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={s.routes} margin={{ bottom: 35 }}>
            <CartesianGrid vertical={false} stroke="var(--border-soft)" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
            <YAxis tickFormatter={formatShort} width={60} />
            <Tooltip
              formatter={(v: number, _n, p) => [
                `${formatRp(v)} · ${p.payload.count} pasien`,
                "Tambahan",
              ]}
            />
            <Bar
              dataKey="value"
              fill={magenta}
              label={{ position: "top", fontSize: 10, formatter: (v: number) => formatShort(v) }}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-3 text-xs">
          {s.routes.map((r) => (
            <span key={r.name}>
              {r.name}: {r.count} pasien · {formatRp(r.value)}
            </span>
          ))}
        </div>
      </Frame>
      <Frame title="Biasa vs COB" empty={!s.upgraded.length}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={s.mix} dataKey="count" nameKey="name" innerRadius="45%" outerRadius="75%">
              <Cell fill={orange} />
              <Cell fill={magenta} />
            </Pie>
            <Tooltip
              formatter={(v: number, _n, p) => [
                `${v} pasien · ${formatRp(p.payload.value)} · ${formatPct((v / s.upgraded.length) * 100)}`,
                "Jumlah",
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-3 text-xs">
          {s.mix.map((m) => (
            <span key={m.name}>
              {m.name}: {m.count} pasien · {formatRp(m.value)} ·{" "}
              {formatPct((m.count / s.upgraded.length) * 100)}
            </span>
          ))}
        </div>
      </Frame>
      <Frame title="Tren Naik Kelas" empty={!s.trend.length}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={s.trend}>
            <CartesianGrid stroke="var(--border-soft)" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={formatShort} width={60} />
            <Tooltip
              formatter={(v: number, n, p) => [
                `${formatRp(v)} · ${n === "Biasa" ? p.payload.countBiasa : p.payload.countCob} pasien`,
                n,
              ]}
            />
            <Legend />
            <Line type="monotone" dataKey="biasa" name="Biasa" stroke={orange} strokeWidth={3} />
            <Line type="monotone" dataKey="cob" name="COB" stroke={magenta} strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </Frame>
      <Frame title="Penjamin COB Teratas" empty={!s.payers.length}>
        <ResponsiveContainer width="100%" height={Math.max(300, s.payers.length * 44)}>
          <BarChart data={s.payers} layout="vertical" margin={{ right: 25 }}>
            <CartesianGrid horizontal={false} stroke="var(--border-soft)" />
            <XAxis type="number" tickFormatter={formatShort} />
            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v: number, _n, p) => [
                `${formatRp(v)} · ${p.payload.count} pasien`,
                "Total COB",
              ]}
            />
            <Bar dataKey="value" fill={magenta} />
          </BarChart>
        </ResponsiveContainer>
      </Frame>
    </div>
  );
}
