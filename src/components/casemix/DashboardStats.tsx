import {
  Users,
  Wallet,
  Receipt,
  TrendingUp,
  Hospital,
  ArrowUpRight,
  Scale,
  Percent,
} from "lucide-react";
import { totals, upgradeStats, formatRp, formatPct, type Patient } from "@/lib/casemix";
import { cn } from "@/lib/utils";
export function DashboardStats({ rows }: { rows: Patient[] }) {
  const t = totals(rows),
    u = upgradeStats(rows);
  const items = [
    {
      label: "Total Pasien",
      value: String(t.count),
      sub: `${u.upgraded.length} pasien naik kelas`,
      icon: Users,
    },
    {
      label: "Total Pendapatan",
      value: formatRp(t.totalPendapatan),
      sub: "INACBGs + Tambahan",
      icon: Wallet,
    },
    {
      label: "Total Billing RS",
      value: formatRp(t.billing),
      sub: "Total tagihan rumah sakit",
      icon: Receipt,
    },
    {
      label: "Saving / Margin",
      value: formatRp(t.saving),
      sub: "Setelah investasi, SDM & operasional",
      icon: TrendingUp,
      tone: t.saving < 0 ? "text-destructive" : "text-success",
    },
    { label: "Total INACBGs", value: formatRp(t.inacbgs), sub: "Pendapatan klaim", icon: Hospital },
    {
      label: "Total Tambahan Naik Kelas / COB",
      value: formatRp(u.income),
      sub: `COB: ${formatRp(u.incomeCob)} • Biasa: ${formatRp(u.incomeBiasa)}`,
      icon: ArrowUpRight,
    },
    {
      label: "Selisih",
      value: formatRp(t.selisih),
      sub: "Pendapatan − Billing",
      icon: Scale,
      tone: t.selisih < 0 ? "text-destructive" : "text-success",
    },
    {
      label: "CRR Rata-rata",
      value: formatPct(t.crr),
      sub: "Total pendapatan ÷ total billing",
      icon: Percent,
      tone: t.crr < 100 ? "text-destructive" : "text-success",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {items.map((i) => (
        <div
          key={i.label}
          className="relative flex h-40 min-w-0 flex-col justify-between rounded-lg border border-border-soft bg-surface p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-medium text-muted-foreground">{i.label}</p>
            <i.icon className="h-4 w-4 shrink-0 text-primary" />
          </div>
          <p
            className={cn(
              "tabular break-words text-base font-extrabold 2xl:text-xl",
              i.tone ?? "text-foreground",
            )}
          >
            {i.value}
          </p>
          <p className="text-[10px] leading-relaxed text-muted-foreground">{i.sub}</p>
        </div>
      ))}
    </div>
  );
}
