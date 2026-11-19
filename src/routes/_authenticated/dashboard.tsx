import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/casemix/AppHeader";
import { ChartsGrid } from "@/components/casemix/Charts";
import { DataTools } from "@/components/casemix/DataTools";
import { PatientForm } from "@/components/casemix/PatientForm";
import { PatientTable } from "@/components/casemix/PatientTable";
import { PeriodBar } from "@/components/casemix/PeriodBar";
import { StatCards } from "@/components/casemix/StatCards";
import { usePatientsLive } from "@/hooks/use-patients-live";
import { inPeriod, matchesSearch, periodLabel, permissions, totals, warnings, type Patient } from "@/lib/casemix";
import { deletePatient, meQuery, patientsQuery, savePatient } from "@/lib/data";
import { defaultFilter, yearsOf } from "@/lib/period";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Casemix RS V4" },
      { name: "description", content: "Dashboard Casemix: INACBGs, billing, saving, CRR, alokasi SDM dan operasional per periode." },
      { property: "og:title", content: "Dashboard — Casemix RS V4" },
      { property: "og:description", content: "Dashboard Casemix: INACBGs, billing, saving, CRR, alokasi SDM dan operasional per periode." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(meQuery), context.queryClient.ensureQueryData(patientsQuery)]),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: all } = useSuspenseQuery(patientsQuery);
  usePatientsLive();

  const [filter, setFilter] = useState(() => defaultFilter(all));
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Patient | null>(null);

  const searched = useMemo(() => all.filter((p) => matchesSearch(p, search)), [all, search]);
  const filtered = useMemo(() => searched.filter((p) => inPeriod(p, filter)), [searched, filter]);
  const t = useMemo(() => totals(filtered), [filtered]);
  const warnCount = useMemo(() => filtered.filter((p) => warnings(p).length > 0).length, [filtered]);

  if (!me) return null;
  const perm = permissions(me);
  const refresh = () => qc.invalidateQueries({ queryKey: ["patients"] });

  async function onSave(p: Patient) {
    await savePatient(p);
    setEditing(null);
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
    requestAnimationFrame(() => document.getElementById("form-pasien")?.scrollIntoView({ behavior: "smooth" }));
  }

  return (
    <main className="mx-auto max-w-7xl px-3 py-3 md:px-6 md:py-6">
      <AppHeader me={me} active="dashboard" />
      <PeriodBar filter={filter} onChange={setFilter} search={search} onSearch={setSearch} years={yearsOf(all)} />

      <div className="space-y-4">
        <StatCards t={t} />

        {warnCount > 0 && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive-soft p-3 text-sm font-semibold text-destructive">
            ⚠ {warnCount} pasien pada periode ini melebihi batas Darah (Rp 700.000) atau PA (Rp 400.000). Lihat tanda ⚠ di tabel.
          </div>
        )}

        <ChartsGrid trendSource={searched} filtered={filtered} totals={t} filter={filter} />

        <PatientForm me={me} editing={editing} defaultDate={filter.tanggal} onSave={onSave} onCancelEdit={() => setEditing(null)} />

        <DataTools me={me} all={all} filtered={filtered} periodText={periodLabel(filter)} onChanged={refresh} />

        <section className="panel p-3 md:p-4">
          <h2 className="mb-3 text-base font-bold">
            Data Pasien <span className="text-sm font-medium text-muted-foreground">· {filtered.length} dari {all.length}</span>
          </h2>
          <PatientTable rows={filtered} canEdit={perm.canInput} canDelete={perm.hapus} onEdit={onEdit} onDelete={onDelete} />
        </section>

        <p className="pb-4 text-center text-[11px] text-muted-foreground">
          Selisih = INACBGs − Billing · CRR = INACBGs ÷ Billing × 100% · Saving = INACBGs − Investasi 25% − SDM − Ops
        </p>
      </div>
    </main>
  );
}
