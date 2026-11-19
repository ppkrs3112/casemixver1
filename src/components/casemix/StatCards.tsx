import { formatPct, formatRp, type Totals } from "@/lib/casemix";
import { cn } from "@/lib/utils";

function Stat({ label, value, sub, tone = "plain", highlight }: { label: string; value: string; sub?: React.ReactNode; tone?: "primary" | "orange" | "good" | "bad" | "plain"; highlight?: boolean }) {
  return (
    <div className={cn("print-avoid p-3 md:p-4", highlight ? "panel-card" : "panel")}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tabular mt-1 text-base font-extrabold md:text-xl",
          tone === "primary" && "text-primary",
          tone === "orange" && "text-secondary",
          tone === "good" && "text-success",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </p>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function StatCards({ t }: { t: Totals }) {
  const crrGood = t.crr >= 100;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat highlight label="Total INACBGs" value={formatRp(t.inacbgs)} tone="primary" sub={`${t.count} pasien`} />
        <Stat label="Total Billing RS" value={formatRp(t.billing)} tone="orange" />
        <Stat
          highlight
          label="Selisih"
          value={formatRp(t.selisih)}
          tone={t.selisih >= 0 ? "good" : "bad"}
          sub={<span className={cn("font-bold", t.billing > 0 && (crrGood ? "text-success" : "text-destructive"))}>CRR {formatPct(t.crr)}</span>}
        />
        <Stat label="Total Saving" value={formatRp(t.saving)} tone={t.saving >= 0 ? "good" : "bad"} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="SDM Terpakai" value={formatRp(t.sdm)} tone={t.sisaSdm < 0 ? "bad" : "plain"} sub={`Alokasi 40%: ${formatRp(t.alokasiSdm)}`} />
        <Stat label="Ops Terpakai" value={formatRp(t.ops)} tone={t.sisaOps < 0 ? "bad" : "plain"} sub={`Alokasi 35%: ${formatRp(t.alokasiOps)}`} />
        <Stat label="Investasi 25%" value={formatRp(t.investasi)} />
        <Stat
          label="Sisa SDM + Ops"
          value={formatRp(t.sisaSdm + t.sisaOps)}
          tone={t.sisaSdm + t.sisaOps < 0 ? "bad" : "good"}
          sub={`SDM ${formatRp(t.sisaSdm)} · Ops ${formatRp(t.sisaOps)}`}
        />
      </div>
    </div>
  );
}
