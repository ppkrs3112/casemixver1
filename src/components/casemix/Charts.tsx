import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Lightbulb } from "lucide-react";
import {
  crrPerDpjp,
  formatPct,
  formatRp,
  formatShort,
  insightAlokasi,
  insightDpjp,
  insightInvest,
  insightOps,
  insightOpsPie,
  insightSdm,
  insightTrend,
  opsComponents,
  periodLabel,
  trend,
  type Patient,
  type PeriodFilter,
  type Totals,
} from "@/lib/casemix";
import { cn } from "@/lib/utils";

const C = {
  inacbgs: "var(--chart-1)",
  billing: "var(--chart-2)",
  saving: "var(--chart-3)",
  alokasi: "var(--chart-5)",
  terpakai: "var(--chart-1)",
  good: "var(--success)",
  bad: "var(--destructive)",
};
const PIE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-6)",
  "var(--chart-5)",
  "var(--chart-3)",
  "var(--border)",
];

const axis = { fontSize: 11, fill: "var(--muted-foreground)" };
const tooltipStyle = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    fontSize: 12,
  },
  formatter: (v: number) => formatRp(v),
};

function ChartCard({
  no,
  title,
  insights,
  children,
  className,
  tone = "magenta",
}: {
  no: number;
  title: string;
  insights: string[];
  children: React.ReactNode;
  className?: string;
  tone?: "magenta" | "orange";
}) {
  return (
    <section className={cn("panel print-avoid flex flex-col p-4", className)}>
      <h3 className="mb-3 flex items-start gap-2 text-sm font-bold md:text-base">
        <span
          className={cn(
            "grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs",
            tone === "magenta"
              ? "bg-primary-soft text-primary"
              : "bg-secondary-soft text-secondary",
          )}
        >
          {no}
        </span>
        {title}
      </h3>
      <div className="flex-1">{children}</div>
      <div
        className={cn(
          "mt-3 rounded-xl p-3 text-xs leading-relaxed",
          tone === "magenta" ? "bg-primary-soft" : "bg-secondary-soft",
        )}
      >
        {insights.map((s, i) => (
          <p key={i} className="flex gap-1.5">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
            <span>{s}</span>
          </p>
        ))}
      </div>
    </section>
  );
}

function Empty() {
  return (
    <div className="grid h-full min-h-40 place-items-center text-sm text-muted-foreground">
      Belum ada data
    </div>
  );
}

export function ChartsGrid({
  trendSource,
  filtered,
  totals: t,
  filter,
  animate = true,
}: {
  trendSource: Patient[];
  filtered: Patient[];
  totals: Totals;
  filter: PeriodFilter;
  animate?: boolean;
}) {
  const points = trend(trendSource, filter);
  const comps = opsComponents(t);
  const dpjp = crrPerDpjp(filtered);
  const h = 250;
  const trendTitle =
    filter.mode === "harian"
      ? "per tanggal"
      : filter.mode === "bulanan"
        ? "per bulan"
        : "per tahun";

  const sdmPie = [
    { name: "Jasa DPJP", value: t.jasaDpjp },
    { name: "Dokter Umum", value: t.jasaDu },
    { name: "Penunjang", value: t.jasaPenunjang },
    { name: "Konsul Telp", value: t.konsul },
    { name: "Sisa SDM", value: Math.max(0, t.sisaSdm) },
  ].filter((d) => d.value > 0);
  const opsPie = [
    ...comps.map((c) => ({ name: c.label, value: c.terpakai })),
    { name: "Sisa Ops", value: Math.max(0, t.sisaOps) },
  ].filter((d) => d.value > 0);
  const invest = [
    { name: "Investasi", value: t.investasi },
    { name: "Saving", value: t.saving },
    { name: "Selisih", value: t.selisih },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ChartCard
        no={1}
        title={`Pendapatan, INACBGs, Billing & Saving ${trendTitle}`}
        insights={insightTrend(points, t)}
        className="md:col-span-2"
      >
        {points.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height={h + 30}>
            <BarChart data={points} margin={{ left: -10, right: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--border-soft)" />
              <XAxis dataKey="label" tick={axis} interval={filter.mode === "harian" ? 1 : 0} />
              <YAxis tick={axis} tickFormatter={formatShort} width={56} />
              <Tooltip {...tooltipStyle} labelFormatter={(_, p) => p?.[0]?.payload?.key ?? ""} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={0} stroke="var(--muted-foreground)" />
              <Bar
                dataKey="inacbgs"
                name="INACBGs"
                fill={C.inacbgs}
                radius={[6, 6, 0, 0]}
                isAnimationActive={animate}
              />
              <Bar
                dataKey="totalPendapatan"
                name="Total Pendapatan"
                fill="var(--chart-4)"
                radius={[6, 6, 0, 0]}
                isAnimationActive={animate}
              />
              <Bar
                dataKey="billing"
                name="Billing"
                fill={C.billing}
                radius={[6, 6, 0, 0]}
                isAnimationActive={animate}
              />
              <Bar
                dataKey="saving"
                name="Saving"
                fill={C.saving}
                radius={[6, 6, 0, 0]}
                isAnimationActive={animate}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard
        no={2}
        title="Alokasi vs Terpakai SDM & Operasional"
        insights={insightAlokasi(t)}
        tone="orange"
      >
        {t.count === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height={h}>
            <BarChart
              data={[
                { name: "SDM (40%)", alokasi: t.alokasiSdm, terpakai: t.sdm },
                { name: "Operasional (35%)", alokasi: t.alokasiOps, terpakai: t.ops },
              ]}
              margin={{ left: -10, right: 4 }}
            >
              <CartesianGrid vertical={false} stroke="var(--border-soft)" />
              <XAxis dataKey="name" tick={axis} />
              <YAxis tick={axis} tickFormatter={formatShort} width={56} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="alokasi"
                name="Alokasi"
                fill={C.alokasi}
                radius={[6, 6, 0, 0]}
                isAnimationActive={animate}
              />
              <Bar
                dataKey="terpakai"
                name="Terpakai"
                fill={C.terpakai}
                radius={[6, 6, 0, 0]}
                isAnimationActive={animate}
              >
                {[t.sisaSdm, t.sisaOps].map((s, i) => (
                  <Cell key={i} fill={s < 0 ? C.bad : C.terpakai} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard no={3} title="Rincian SDM" insights={insightSdm(t)}>
        {sdmPie.length === 0 ? <Empty /> : <Donut data={sdmPie} h={h} animate={animate} />}
      </ChartCard>

      <ChartCard
        no={4}
        title="Alokasi vs Terpakai per Komponen Operasional"
        insights={insightOps(comps, t)}
        tone="orange"
      >
        {t.count === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height={h}>
            <BarChart data={comps} margin={{ left: -10, right: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--border-soft)" />
              <XAxis
                dataKey="label"
                tick={axis}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={44}
              />
              <YAxis tick={axis} tickFormatter={formatShort} width={56} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="alokasi"
                name="Alokasi"
                fill={C.alokasi}
                radius={[6, 6, 0, 0]}
                isAnimationActive={animate}
              />
              <Bar
                dataKey="terpakai"
                name="Terpakai"
                fill={C.billing}
                radius={[6, 6, 0, 0]}
                isAnimationActive={animate}
              >
                {comps.map((c) => (
                  <Cell key={c.key} fill={c.terpakai > c.alokasi ? C.bad : C.billing} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard no={5} title="Rincian Operasional" insights={insightOpsPie(t)}>
        {opsPie.length === 0 ? <Empty /> : <Donut data={opsPie} h={h} animate={animate} />}
      </ChartCard>

      <ChartCard
        no={6}
        title="Investasi vs Saving vs Selisih"
        insights={insightInvest(t)}
        tone="orange"
      >
        {t.count === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height={h}>
            <BarChart data={invest} margin={{ left: -10, right: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--border-soft)" />
              <XAxis dataKey="name" tick={axis} />
              <YAxis tick={axis} tickFormatter={formatShort} width={56} />
              <Tooltip {...tooltipStyle} />
              <ReferenceLine y={0} stroke="var(--muted-foreground)" />
              <Bar
                dataKey="value"
                name="Nilai"
                fill={C.inacbgs}
                radius={[6, 6, 0, 0]}
                isAnimationActive={animate}
              >
                {invest.map((d, i) => (
                  <Cell
                    key={d.name}
                    fill={d.value < 0 ? C.bad : [C.inacbgs, C.saving, C.billing][i]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard no={7} title="CRR per DPJP" insights={insightDpjp(dpjp)} className="md:col-span-2">
        {dpjp.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, dpjp.length * 38 + 40)}>
            <BarChart data={dpjp} layout="vertical" margin={{ left: 0, right: 40 }}>
              <CartesianGrid horizontal={false} stroke="var(--border-soft)" />
              <XAxis
                type="number"
                tick={axis}
                tickFormatter={(v) => `${v}%`}
                domain={[0, (max: number) => Math.max(120, Math.ceil(max / 10) * 10)]}
              />
              <YAxis type="category" dataKey="dpjp" tick={axis} width={110} />
              <Tooltip
                contentStyle={tooltipStyle.contentStyle}
                formatter={(v: number, _n, p) => [
                  `${formatPct(v)} · ${p.payload.count} pasien`,
                  "CRR",
                ]}
              />
              <ReferenceLine
                x={100}
                stroke="var(--foreground)"
                strokeDasharray="4 4"
                label={{ value: "100%", fontSize: 11, fill: "var(--foreground)", position: "top" }}
              />
              <Bar
                dataKey="crr"
                name="CRR"
                fill={C.good}
                radius={[0, 6, 6, 0]}
                isAnimationActive={animate}
                label={{
                  position: "right",
                  fontSize: 11,
                  formatter: (v: number) => formatPct(v),
                  fill: "var(--foreground)",
                }}
              >
                {dpjp.map((d) => (
                  <Cell key={d.dpjp} fill={d.crr < 100 ? C.bad : C.good} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <p className="mt-1 text-[11px] text-muted-foreground">
          Merah: CRR &lt; 100% (rugi) · Hijau: CRR ≥ 100% · Periode {periodLabel(filter)}
        </p>
      </ChartCard>
    </div>
  );
}

function Donut({
  data,
  h,
  animate,
}: {
  data: { name: string; value: number }[];
  h: number;
  animate: boolean;
}) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="48%"
          outerRadius="80%"
          paddingAngle={2}
          isAnimationActive={animate}
        >
          {data.map((d, i) => (
            <Cell
              key={d.name}
              fill={d.name.startsWith("Sisa") ? "var(--border)" : PIE[i % PIE.length]}
              stroke="var(--surface)"
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          formatter={(v: number) => `${formatRp(v)} (${formatPct((v / total) * 100)})`}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
