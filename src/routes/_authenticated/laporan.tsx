import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { AppHeader } from "@/components/casemix/AppHeader";
import { ChartsGrid } from "@/components/casemix/Charts";
import { PatientTable } from "@/components/casemix/PatientTable";
import { StatCards } from "@/components/casemix/StatCards";
import { Button } from "@/components/ui/button";
import {
  crrPerDpjp,
  formatPct,
  formatRp,
  insightAlokasi,
  insightDpjp,
  insightInvest,
  insightOps,
  opsComponents,
  periodLabel,
  totals,
  warnings,
} from "@/lib/casemix";
import { meQuery, patientsQuery } from "@/lib/data";
import { defaultFilter } from "@/lib/period";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/laporan")({
  head: () => ({
    meta: [
      { title: "Laporan Bulanan — Casemix RS V4" },
      { name: "description", content: "Laporan bulanan Casemix untuk Direksi: ringkasan, grafik, dan tabel siap cetak / PDF." },
      { property: "og:title", content: "Laporan Bulanan — Casemix RS V4" },
      { property: "og:description", content: "Laporan bulanan Casemix untuk Direksi: ringkasan, grafik, dan tabel siap cetak / PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(meQuery), context.queryClient.ensureQueryData(patientsQuery)]),
  component: Laporan,
});

function Laporan() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: all } = useSuspenseQuery(patientsQuery);
  const [bulan, setBulan] = useState(() => defaultFilter(all).bulan);
  const filter = useMemo(() => ({ ...defaultFilter(all), mode: "bulanan" as const, bulan }), [all, bulan]);
  const rows = useMemo(() => all.filter((p) => p.tanggal.startsWith(bulan)).sort((a, b) => a.tanggal.localeCompare(b.tanggal)), [all, bulan]);
  const t = useMemo(() => totals(rows), [rows]);
  const dpjp = crrPerDpjp(rows);
  const warn = rows.filter((p) => warnings(p).length);
  const ringkasan = [...insightAlokasi(t), ...insightOps(opsComponents(t), t), ...insightInvest(t), ...insightDpjp(dpjp)];
  if (!me) return null;

  return (
    <main className="mx-auto max-w-5xl px-3 py-3 md:px-6 md:py-6">
      <AppHeader me={me} active="laporan" />

      <div className="panel no-print mb-4 flex flex-wrap items-center gap-2 p-3">
        <label htmlFor="bulan-lap" className="text-sm font-bold text-primary">Bulan laporan</label>
        <input id="bulan-lap" type="month" value={bulan} onChange={(e) => setBulan(e.target.value)} className="h-10 rounded-xl border border-input bg-surface px-3 text-sm" />
        <Button className="ml-auto" onClick={() => window.print()}>
          <Printer /> Print / Simpan PDF
        </Button>
        <p className="w-full text-[11px] text-muted-foreground">Di jendela cetak, pilih “Simpan sebagai PDF” untuk mengirim ke Direksi.</p>
      </div>

      <article className="space-y-5">
        <header className="panel-card p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Laporan Bulanan Casemix</p>
          <h1 className="mt-1 font-display text-3xl text-primary">{periodLabel(filter)}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.count} pasien · disiapkan oleh {me.nama || me.user} · dicetak {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </header>

        <StatCards t={t} />

        <section className="panel print-avoid p-4">
          <h2 className="mb-2 font-bold">Ringkasan & Temuan</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {ringkasan.map((s, i) => <li key={i}>{s}</li>)}
            {warn.length > 0 && <li className="font-semibold text-destructive">{warn.length} pasien melebihi batas Darah / PA.</li>}
          </ul>
        </section>

        <ChartsGrid trendSource={all} filtered={rows} totals={t} filter={filter} animate={false} />

        <section className="panel print-break p-4">
          <h2 className="mb-3 font-bold">Rekap per DPJP</h2>
          <div className="overflow-x-auto rounded-2xl border border-border-soft">
            <table className="tabular w-full whitespace-nowrap text-xs md:text-sm">
              <thead>
                <tr className="bg-primary text-left text-primary-foreground">
                  <th className="p-2.5">DPJP</th>
                  <th className="p-2.5 text-right">Pasien</th>
                  <th className="p-2.5 text-right">INACBGs</th>
                  <th className="p-2.5 text-right">Billing</th>
                  <th className="p-2.5 text-right">Selisih</th>
                  <th className="p-2.5 text-right">CRR</th>
                </tr>
              </thead>
              <tbody>
                {dpjp.map((d, i) => (
                  <tr key={d.dpjp} className={cn("border-t border-border-soft", i % 2 ? "bg-card" : "bg-surface")}>
                    <td className="p-2.5 font-semibold">{d.dpjp}</td>
                    <td className="p-2.5 text-right">{d.count}</td>
                    <td className="p-2.5 text-right">{formatRp(d.inacbgs)}</td>
                    <td className="p-2.5 text-right">{formatRp(d.billing)}</td>
                    <td className={cn("p-2.5 text-right font-semibold", d.inacbgs - d.billing < 0 ? "text-destructive" : "text-success")}>{formatRp(d.inacbgs - d.billing)}</td>
                    <td className={cn("p-2.5 text-right font-bold", d.crr < 100 ? "text-destructive" : "text-success")}>{formatPct(d.crr)}</td>
                  </tr>
                ))}
                {dpjp.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Tidak ada data bulan ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel p-4">
          <h2 className="mb-3 font-bold">Daftar Pasien</h2>
          <PatientTable rows={rows} canEdit={false} canDelete={false} compact />
        </section>

        <footer className="print-avoid grid grid-cols-2 gap-6 px-4 pb-6 pt-8 text-center text-xs">
          <div>
            <p>Disiapkan oleh,</p>
            <div className="h-16" />
            <p className="font-semibold">{me.nama || me.user}</p>
          </div>
          <div>
            <p>Mengetahui, Direksi</p>
            <div className="h-16" />
            <p className="font-semibold">( ........................................ )</p>
          </div>
        </footer>
      </article>
    </main>
  );
}
