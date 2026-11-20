import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PatientTable } from "@/components/casemix/PatientTable";
import { PatientForm } from "@/components/casemix/PatientForm";
import { DataTools } from "@/components/casemix/DataTools";
import { meQuery, patientsQuery, savePatient, deletePatient } from "@/lib/data";
import { payersQuery } from "@/lib/payers";
import { permissions, matchesSearchBy, inRange, type Patient, type SearchField } from "@/lib/casemix";
import { FilterBar, DEFAULT_TIME, rangeOf, type TimeState } from "@/components/casemix/FilterBar";
import { todayISO } from "@/lib/download";
export const Route = createFileRoute("/_authenticated/pasien")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s["q"] === "string" ? s["q"] : "" }),
  head: () => ({
    meta: [
      { title: "Daftar Pasien — Casemix RS" },
      {
        name: "description",
        content: "Daftar pasien rawat inap Casemix menurut No SEP, RM dan DPJP.",
      },
      { property: "og:title", content: "Daftar Pasien — Casemix RS" },
      {
        property: "og:description",
        content: "Data rawat inap dan biaya pasien Casemix rumah sakit.",
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
  component: Patients,
});
function Patients() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: all } = useSuspenseQuery(patientsQuery);
  const { q } = Route.useSearch();
  const [search, setSearch] = useState(q);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const [time, setTime] = useState<TimeState>(q ? { ...DEFAULT_TIME, kind: "semua" } : DEFAULT_TIME);
  const [field, setField] = useState<SearchField>("semua");
  const range = rangeOf(time);
  const rows = all.filter((p) => matchesSearchBy(p, search, field) && inRange(p, range));
  if (!me) return null;
  const perm = permissions(me);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["patients"] });
  };
  async function save(p: Patient) {
    await savePatient(p);
    refresh();
    setOpen(false);
  }
  async function remove(p: Patient) {
    if (!window.confirm(`Hapus data pasien ${p.nama}?`)) return;
    try {
      await deletePatient(p.id);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus");
    }
  }
  return (
    <main className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap justify-between gap-3">
        <h1 className="text-2xl font-bold">Daftar Pasien</h1>
        {perm.canInput && (
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus />
            Tambah Pasien
          </Button>
        )}
      </div>
      <FilterBar
        time={time}
        onTime={setTime}
        search={search}
        field={field}
        onSearch={(v, f) => {
          setSearch(v);
          setField(f);
        }}
        count={rows.length}
        onReset={() => setSearch("")}
      />
      <section className="rounded-lg border border-border-soft bg-surface p-4">
        <PatientTable
          rows={rows}
          canEdit={perm.canInput}
          canDelete={perm.hapus}
          onEdit={(p) => {
            setEditing(p);
            setOpen(true);
          }}
          onDelete={remove}
        />
      </section>
      <DataTools me={me} all={all} filtered={rows} periodText={range.label} onChanged={refresh} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Pasien" : "Tambah Pasien"}</DialogTitle>
          </DialogHeader>
          <PatientForm
            me={me}
            editing={editing}
            defaultDate={todayISO()}
            onSave={save}
            onCancelEdit={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </main>
  );
}
