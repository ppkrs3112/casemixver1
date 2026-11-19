import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Download, Eye } from "lucide-react";
import { AppHeader } from "@/components/casemix/AppHeader";
import { Choice } from "@/components/casemix/Choice";
import { UpgradeCharts } from "@/components/casemix/UpgradeCharts";
import { PatientDetail } from "@/components/casemix/PatientTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calc,
  dateRangePreset,
  formatRp,
  permissions,
  upgradeRoute,
  upgradeStats,
  type Patient,
} from "@/lib/casemix";
import { meQuery, patientsQuery } from "@/lib/data";
import { todayISO } from "@/lib/download";
import { exportExcel, exportPatientsExcel } from "@/lib/excel";
import { usePatientsLive } from "@/hooks/use-patients-live";
import { toast } from "sonner";
export const Route = createFileRoute("/_authenticated/naik-kelas")({
  head: () => ({
    meta: [
      { title: "Dashboard Naik Kelas — Casemix RS V4" },
      {
        name: "description",
        content:
          "Pantau pasien naik kelas biasa dan COB, pendapatan tambahan, tren, rute kelas dan penjamin.",
      },
      { property: "og:title", content: "Dashboard Naik Kelas — Casemix RS V4" },
      {
        property: "og:description",
        content: "Ringkasan pasien naik kelas, tambahan pendapatan dan penjamin COB.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(meQuery),
      context.queryClient.ensureQueryData(patientsQuery),
    ]),
  component: Upgrades,
});
function Upgrades() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: all } = useSuspenseQuery(patientsQuery);
  usePatientsLive();
  const [range, setRange] = useState({ from: "", to: "" });
  const [route, setRoute] = useState("");
  const [kind, setKind] = useState("");
  const [payer, setPayer] = useState("");
  const [sort, setSort] = useState("Nominal terbesar");
  const [detail, setDetail] = useState<Patient | null>(null);
  const rows = all.filter(
    (p) => (!range.from || p.tanggal >= range.from) && (!range.to || p.tanggal <= range.to),
  );
  const s = upgradeStats(rows);
  const patients = s.upgraded.filter(
    (p) =>
      (!route || upgradeRoute(p) === route) &&
      (!kind || p.jenisNaikKelas === kind) &&
      (!payer || p.namaPenjaminCob === payer),
  );
  const payers = [...s.payers].sort((a, b) =>
    sort === "Nama A–Z" ? a.name.localeCompare(b.name) : b.value - a.value,
  );
  if (!me) return null;
  const perm = permissions(me);
  const fail = () => toast.error("Export Excel gagal.");
  return (
    <main className="mx-auto max-w-7xl px-3 py-3 md:px-6 md:py-6">
      <AppHeader me={me} active="naik-kelas" />
      <h2 className="mb-4 font-display text-2xl text-primary">Dashboard Naik Kelas</h2>
      <section className="mb-5 space-y-3 border-b border-border-soft pb-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="range-from">Tanggal Masuk Dari</Label>
            <Input
              id="range-from"
              type="date"
              value={range.from}
              max={range.to || undefined}
              onChange={(e) => setRange({ ...range, from: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="range-to">Tanggal Masuk Sampai</Label>
            <Input
              id="range-to"
              type="date"
              value={range.to}
              min={range.from || undefined}
              onChange={(e) => setRange({ ...range, to: e.target.value })}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {["Hari Ini", "7 Hari Terakhir", "Bulan Ini", "Bulan Lalu", "Semua"].map((p) => (
            <Button
              key={p}
              size="sm"
              variant="soft"
              onClick={() => setRange(dateRangePreset(p, todayISO()))}
            >
              {p}
            </Button>
          ))}
        </div>
        {range.from && range.to && range.from > range.to && (
          <p className="text-destructive">Tanggal sampai harus setelah tanggal dari.</p>
        )}
      </section>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[
          ["Total Pasien Naik Kelas", s.upgraded.length],
          ["Total Naik Kelas Biasa", s.biasa],
          ["Total Naik Kelas COB", s.cob],
          ["Total Income Biasa (Rp)", formatRp(s.incomeBiasa)],
          ["Total Income COB (Rp)", formatRp(s.incomeCob)],
          ["Total Income Semua (Rp)", formatRp(s.income)],
        ].map(([l, v], i) => (
          <div key={l} className="min-w-0 rounded-lg border border-border-soft bg-card p-3">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p
              className={`mt-2 break-words text-lg font-bold ${i === 1 || i === 3 ? "text-secondary" : "text-primary"}`}
            >
              {v}
            </p>
          </div>
        ))}
      </div>
      <UpgradeCharts s={s} />
      <section className="mt-6 border-t border-border-soft py-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h3 className="font-bold">Tabel Penjamin COB</h3>
          <Choice
            id="payer-sort"
            label="Urutkan"
            value={sort}
            onChange={setSort}
            options={["Nominal terbesar", "Nama A–Z"]}
          />
          {perm.export && (
            <Button
              variant="secondary"
              onClick={() =>
                exportExcel(
                  "rekap-penjamin-cob.xlsx",
                  [
                    "No",
                    "Nama Penjamin",
                    "Jumlah Pasien COB",
                    "Total Nominal COB",
                    "Rata-rata per Pasien",
                  ],
                  payers.map((p, i) => [i + 1, p.name, p.count, p.value, p.average]),
                ).catch(fail)
              }
            >
              <Download />
              Export Excel Penjamin
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                {[
                  "No",
                  "Nama Penjamin",
                  "Jumlah Pasien COB",
                  "Total Nominal COB",
                  "Rata-rata per Pasien",
                  "Aksi",
                ].map((h) => (
                  <th key={h} className="p-3 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payers.map((p, i) => (
                <tr key={p.name} className="border-b border-border-soft">
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3 font-semibold">{p.name}</td>
                  <td className="p-3">{p.count}</td>
                  <td className="p-3">{formatRp(p.value)}</td>
                  <td className="p-3">{formatRp(p.average)}</td>
                  <td className="p-3">
                    <Button
                      variant="soft"
                      size="sm"
                      onClick={() => {
                        setPayer(p.name);
                        setKind("COB");
                        setRoute("");
                        document
                          .getElementById("upgrade-patients")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      <Eye />
                      Lihat Pasien
                    </Button>
                  </td>
                </tr>
              ))}
              {!payers.length && (
                <tr>
                  <td colSpan={6} className="p-5 text-center text-muted-foreground">
                    Belum ada pasien COB pada rentang ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section id="upgrade-patients" className="mt-5 border-t border-border-soft py-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold">Pasien Naik Kelas · {patients.length}</h3>
          {perm.export && (
            <Button
              variant="secondary"
              onClick={() => exportPatientsExcel("pasien-naik-kelas.xlsx", patients).catch(fail)}
            >
              <Download />
              Export Excel Pasien
            </Button>
          )}
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Choice
            id="route-filter"
            label="Rute"
            value={route}
            onChange={setRoute}
            options={[{ value: "", label: "Semua" }, ...s.routes.map((r) => r.name)]}
          />
          <Choice
            id="kind-filter"
            label="Jenis"
            value={kind}
            onChange={setKind}
            options={[{ value: "", label: "Semua" }, "Biasa", "COB"]}
          />
          <Choice
            id="payer-filter"
            label="Penjamin"
            value={payer}
            onChange={setPayer}
            options={[{ value: "", label: "Semua" }, ...s.payers.map((p) => p.name)]}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                {[
                  "No SEP",
                  "Tanggal Masuk",
                  "Nama",
                  "No RM",
                  "Kelas Awal -> Kelas Tujuan",
                  "Jenis",
                  "Nama Penjamin COB",
                  "Tambahan (Rp)",
                  "INACBGs",
                  "Total Pendapatan",
                  "Saving",
                  "Detail",
                ].map((h) => (
                  <th key={h} className="p-3 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => {
                const c = calc(p);
                return (
                  <tr key={p.id} className="border-b border-border-soft">
                    {[
                      p.noSep,
                      p.tanggal,
                      p.nama,
                      p.rm,
                      upgradeRoute(p),
                      p.jenisNaikKelas,
                      p.namaPenjaminCob || "-",
                      formatRp(p.tambahanNaikKelas),
                      formatRp(p.inacbgs),
                      formatRp(c.totalPendapatan),
                      formatRp(c.saving),
                    ].map((v, i) => (
                      <td key={i} className="p-3">
                        {v}
                      </td>
                    ))}
                    <td className="p-3">
                      <Button
                        size="icon"
                        variant="soft"
                        aria-label={`Detail ${p.nama}`}
                        onClick={() => setDetail(p)}
                      >
                        <Eye />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {!patients.length && (
                <tr>
                  <td colSpan={12} className="p-5 text-center text-muted-foreground">
                    Tidak ada pasien sesuai filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <PatientDetail patient={detail} onClose={() => setDetail(null)} />
    </main>
  );
}
