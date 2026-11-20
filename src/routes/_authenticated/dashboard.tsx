import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/casemix/AppHeader";
import { DashboardStats } from "@/components/casemix/DashboardStats";
import { DashboardCharts } from "@/components/casemix/DashboardCharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Download,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { exportPatientsExcel } from "@/lib/excel";
import { todayISO } from "@/lib/download";
import { ChartsGrid } from "@/components/casemix/Charts";
import { DataTools } from "@/components/casemix/DataTools";
import { PatientForm } from "@/components/casemix/PatientForm";
import { PatientTable } from "@/components/casemix/PatientTable";
import { FilterBar, DEFAULT_TIME, rangeOf, type TimeState } from "@/components/casemix/FilterBar";
import { StatCards } from "@/components/casemix/StatCards";
import { usePatientsLive } from "@/hooks/use-patients-live";
import {
  inRange,
  matchesSearchBy,
  type PeriodFilter,
  type SearchField,
  permissions,
  totals,
  warnings,
  type Patient,
} from "@/lib/casemix";
import { deletePatient, meQuery, patientsQuery, savePatient } from "@/lib/data";
import { Choice } from "@/components/casemix/Choice";
import { Button } from "@/components/ui/button";
import { payersQuery } from "@/lib/payers";
import { los } from "@/lib/casemix";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Casemix RS V4" },
      {
        name: "description",
        content:
          "Dashboard Casemix: INACBGs, billing, saving, CRR, alokasi SDM dan operasional per periode.",
      },
      { property: "og:title", content: "Dashboard — Casemix RS V4" },
      {
        property: "og:description",
        content:
          "Dashboard Casemix: INACBGs, billing, saving, CRR, alokasi SDM dan operasional per periode.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(meQuery),
      context.queryClient.ensureQueryData(patientsQuery),
      context.queryClient.ensureQueryData(payersQuery),
    ]),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: all } = useSuspenseQuery(patientsQuery);
  usePatientsLive();

  const [time, setTime] = useState<TimeState>(DEFAULT_TIME);
  const [field, setField] = useState<SearchField>("semua");
  const [payerFilter, setPayerFilter] = useState("");
  const range = rangeOf(time);
  const filter: PeriodFilter =
    time.kind === "tahun"
      ? { mode: "tahunan", tanggal: range.from, bulan: "", tahun: range.from.slice(0, 4) }
      : time.kind === "semua"
        ? { mode: "tahunan", tanggal: "", bulan: "", tahun: "" }
        : { mode: "bulanan", tanggal: range.to || todayISO(), bulan: (range.from || todayISO()).slice(0, 7), tahun: "" };
  const [kind, setKind] = useState("");
  const [losFilter, setLosFilter] = useState("");
  const [dpjpFilter, setDpjpFilter] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);

  const searched = useMemo(() => all.filter((p) => matchesSearchBy(p, search, field)), [all, search, field]);
  const filtered = useMemo(
    () => searched.filter((p) => inRange(p, range)),
    [searched, range.from, range.to, range.error],
  );
  const tableRows = filtered.filter(
    (p) =>
      (!kind || p.jenisNaikKelas === kind) &&
      (!payerFilter || p.namaPenjaminCob === payerFilter) &&
      (!dpjpFilter || p.dpjp === dpjpFilter) &&
      (!losFilter ||
        (losFilter === "Belum pulang"
          ? los(p) === null
          : losFilter === "1–3 hari"
            ? (los(p) ?? 0) >= 1 && (los(p) ?? 0) <= 3
            : losFilter === "4–7 hari"
              ? (los(p) ?? 0) >= 4 && (los(p) ?? 0) <= 7
              : (los(p) ?? 0) > 7)),
  );
  const t = useMemo(() => totals(filtered), [filtered]);
  const warnCount = useMemo(
    () => filtered.filter((p) => warnings(p).length > 0).length,
    [filtered],
  );

  if (!me) return null;
  const perm = permissions(me);
  const refresh = () => qc.invalidateQueries({ queryKey: ["patients"] });

  async function onSave(p: Patient) {
    await savePatient(p);
    setEditing(null);
    setFormOpen(false);
    refresh();
  }

  async function onDelete(p: Patient) {
    if (!window.confirm(`Hapus data pasien ${p.nama} (${p.tanggal})?`)) return;
    try {
      await deletePatient(p.id);
      toast.success("Data dihapus.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus.");
    }
  }

  function onEdit(p: Patient) {
    setEditing(p);
    setFormOpen(true);
    requestAnimationFrame(() =>
      document.getElementById("form-pasien")?.scrollIntoView({ behavior: "smooth" }),
    );
  }

  function reset() {
    setSearch("");
    setKind("");
    setDpjpFilter("");
    setLosFilter("");
    setPayerFilter("");
    setField("semua");
  }
  const period = range.label;
  return (
    <main className="space-y-6 p-4 md:p-6">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">Dashboard Casemix</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ringkasan Keuangan & Kinerja RS - Periode {period}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {perm.canInput && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus />
                Tambah Pasien
              </Button>
            )}
            {perm.export && (
              <Button
                variant="secondary"
                onClick={() =>
                  exportPatientsExcel("casemix.xlsx", tableRows).catch(() =>
                    toast.error("Export gagal"),
                  )
                }
              >
                <Download />
                Export Excel
              </Button>
            )}

          </div>
        </div>
      </section>
      <FilterBar
        time={time}
        onTime={setTime}
        search={search}
        field={field}
        onSearch={(q, f) => {
          setSearch(q);
          setField(f);
        }}
        count={tableRows.length}
        onReset={reset}
        advanced={
          <>
            <Choice
              id="main-dpjp"
              label="Filter DPJP"
              value={dpjpFilter}
              onChange={setDpjpFilter}
              options={[
                { value: "", label: "Semua" },
                ...[...new Set(all.map((p) => p.dpjp).filter(Boolean))].sort(),
              ]}
            />
            <Choice
              id="main-kind"
              label="Filter Naik Kelas"
              value={kind}
              onChange={setKind}
              options={[{ value: "", label: "Semua" }, "Tidak", "Biasa", "COB"]}
            />
            <Choice
              id="main-los"
              label="Filter LOS"
              value={losFilter}
              onChange={setLosFilter}
              options={[{ value: "", label: "Semua" }, "Belum pulang", "1–3 hari", "4–7 hari", "> 7 hari"]}
            />
            <Choice
              id="main-payer"
              label="Filter Penjamin COB"
              value={payerFilter}
              onChange={setPayerFilter}
              options={[
                { value: "", label: "Semua" },
                ...[...new Set(all.map((p) => p.namaPenjaminCob).filter(Boolean))].sort(),
              ]}
            />
          </>
        }
      />
      <DashboardStats rows={tableRows} />
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Grafik & Analisis</h2>
          <Button asChild variant="ghost">
            <Link to="/naik-kelas">Lihat Dashboard Naik Kelas →</Link>
          </Button>
        </div>
        <DashboardCharts rows={tableRows} monthly={time.kind === "tahun" || time.kind === "semua"} />
      </section>
      <section className="rounded-lg border border-border-soft bg-surface p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">Tabel Pasien</h2>
          <span className="text-xs text-muted-foreground">{tableRows.length} pasien</span>
        </div>
        <PatientTable
          rows={tableRows}
          canEdit={perm.canInput}
          canDelete={perm.hapus}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </section>
      <DataTools me={me} all={all} filtered={tableRows} periodText={period} onChanged={refresh} />
      <details className="rounded-lg border border-border-soft bg-surface p-4">
        <summary className="cursor-pointer text-sm font-bold">
          Analisis Lengkap · Alokasi SDM, Operasional & 7 Grafik
        </summary>
        <div className="mt-4 space-y-4">

          <StatCards t={t} />
          <ChartsGrid trendSource={searched} filtered={filtered} totals={t} filter={filter} />
          {warnCount > 0 && (
            <p className="text-sm text-destructive">
              {warnCount} pasien melebihi batas Darah / PA.
            </p>
          )}
        </div>
      </details>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Pasien" : "Tambah Pasien"}</DialogTitle>
          </DialogHeader>
          <PatientForm
            me={me}
            editing={editing}
            defaultDate={todayISO()}
            onSave={onSave}
            onCancelEdit={() => {
              setEditing(null);
              setFormOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </main>
  );
}
