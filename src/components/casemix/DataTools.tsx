import { useRef, useState } from "react";
import { Database, Download, FileDown, FileUp, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CSV_TEMPLATE, parseCsv, permissions, toCsv, type Patient } from "@/lib/casemix";
import { deleteAllPatients, insertPatients, preparePatients, type Account } from "@/lib/data";
import { exportPatientsExcel } from "@/lib/excel";
import { downloadFile, readFileText, todayISO } from "@/lib/download";

export function DataTools({
  me,
  all,
  filtered,
  periodText,
  onChanged,
}: {
  me: Account;
  all: Patient[];
  filtered: Patient[];
  periodText: string;
  onChanged: () => void;
}) {
  const perm = permissions(me);
  const csvRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const stamp = todayISO();

  function exportCsv() {
    downloadFile(
      `casemix-${periodText.replace(/\s+/g, "-").toLowerCase()}.csv`,
      "\uFEFF" + toCsv(filtered),
      "text/csv;charset=utf-8",
    );
    toast.success(`${filtered.length} baris diekspor.`);
  }

  function backup() {
    const payload = {
      app: "casemix-rs-v4",
      exportedAt: new Date().toISOString(),
      count: all.length,
      data: all.map(({ id: _id, ...rest }) => rest),
    };
    downloadFile(
      `backup-casemix-${stamp}.json`,
      JSON.stringify(payload, null, 1),
      "application/json",
    );
    toast.success(`Backup ${all.length} pasien diunduh — bisa dikirim via WA.`);
  }

  async function importCsv(file: File) {
    setBusy(true);
    try {
      const { rows, errors } = parseCsv(await readFileText(file), () => "");
      if (rows.length === 0) throw new Error(errors[0] ?? "Tidak ada baris valid.");
      await insertPatients(rows);
      toast.success(`${rows.length} pasien diimpor.`);
      if (errors.length)
        toast.warning(`${errors.length} baris dilewati: ${errors.slice(0, 3).join(" ")}`);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import gagal.");
    } finally {
      setBusy(false);
    }
  }

  async function restore(file: File) {
    setBusy(true);
    try {
      const json = JSON.parse(await readFileText(file));
      const list: Patient[] = (Array.isArray(json) ? json : (json.data ?? [])).filter(
        (r: Patient) => r && r.tanggal && r.nama,
      );
      if (list.length === 0) throw new Error("File backup tidak berisi data pasien.");
      if (
        !window.confirm(
          `Restore akan MENGGANTI semua data (${all.length} pasien) dengan ${list.length} pasien dari backup. Lanjutkan?`,
        )
      )
        return;
      const prepared = await preparePatients(list);
      await deleteAllPatients();
      await insertPatients(prepared.map((r) => ({ ...r, id: "" })));
      toast.success(`${list.length} pasien dipulihkan dari backup.`);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore gagal.");
    } finally {
      setBusy(false);
    }
  }

  async function clearAll() {
    if (
      !window.confirm(
        `Hapus SEMUA ${all.length} data pasien untuk seluruh tim? Tindakan ini tidak bisa dibatalkan.`,
      )
    )
      return;
    setBusy(true);
    try {
      await deleteAllPatients();
      toast.success("Semua data dihapus.");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel no-print flex flex-wrap items-center gap-2 p-3">
      <span className="mr-1 flex items-center gap-1.5 text-sm font-bold text-primary">
        <Database className="h-4 w-4" /> Data
      </span>
      {perm.export && (
        <>
          <Button size="sm" variant="secondary" onClick={exportCsv}>
            <Download /> Export CSV
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              exportPatientsExcel(`casemix-${stamp}.xlsx`, filtered).catch(() =>
                toast.error("Export Excel gagal."),
              )
            }
          >
            <Download /> Export Excel
          </Button>
          <Button size="sm" variant="soft" onClick={backup}>
            <FileDown /> Backup JSON
          </Button>
        </>
      )}
      {perm.canInput && (
        <>
          <Button
            size="sm"
            variant="soft-orange"
            disabled={busy}
            onClick={() => csvRef.current?.click()}
          >
            <FileUp /> Import CSV
          </Button>
          <input
            ref={csvRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) importCsv(f);
            }}
          />
        </>
      )}
      {perm.hapus && (
        <>
          <Button size="sm" variant="soft" disabled={busy} onClick={() => jsonRef.current?.click()}>
            <RotateCcw /> Restore JSON
          </Button>
          <input
            ref={jsonRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) restore(f);
            }}
          />
        </>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={() =>
          downloadFile("template-casemix.csv", "\uFEFF" + CSV_TEMPLATE, "text/csv;charset=utf-8")
        }
      >
        <FileDown /> Template CSV
      </Button>
      {perm.hapus && (
        <Button
          size="sm"
          variant="soft-danger"
          className="md:ml-auto"
          disabled={busy || all.length === 0}
          onClick={clearAll}
        >
          <Trash2 /> Hapus Semua
        </Button>
      )}
    </div>
  );
}
