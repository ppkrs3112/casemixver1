import { useEffect, useState } from "react";
import { AlertTriangle, Eye, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  calc,
  formatPct,
  formatRp,
  warnings,
  MAX_DARAH,
  MAX_PA,
  ALOKASI,
  type Patient,
} from "@/lib/casemix";
import { los, upgradeRoute } from "@/lib/casemix";
import { cn } from "@/lib/utils";

export function PatientTable({
  rows,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  compact,
}: {
  rows: Patient[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit?: (p: Patient) => void;
  onDelete?: (p: Patient) => void;
  compact?: boolean;
}) {
  const [page, setPage] = useState(0);
  const pageSize = 10;
  useEffect(() => setPage(0), [rows]);
  const [detail, setDetail] = useState<Patient | null>(null);
  const shown = compact ? rows : rows.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <>
      <div className="max-h-[600px] overflow-auto rounded-lg border border-border-soft">
        <table className="patient-table tabular w-full whitespace-nowrap text-xs md:text-sm">
          <thead>
            <tr className="bg-primary text-left text-primary-foreground">
              {[
                "No SEP",
                "Tanggal Masuk",
                "Tanggal Pulang",
                "LOS",
                "Nama",
                "No RM",
                "ICD-10",
                "DPJP",
                "Kelas Awal -> Kelas Tujuan",
                "Jenis Naik Kelas",
                "Penjamin COB",
                "Tambahan",
                "INACBGs",
                "Billing",
                "Selisih",
                "CRR",
                "Saving",
                "SDM",
                "Ops",
              ].map((label) => (
                <th key={label} className="p-2.5 font-semibold">
                  {label}
                </th>
              ))}
              {!compact && <th className="no-print p-2.5 text-center font-semibold">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={compact ? 19 : 20} className="p-6 text-center text-muted-foreground">
                  Tidak ada data pada periode / pencarian ini.
                </td>
              </tr>
            )}
            {shown.map((p, i) => {
              const c = calc(p);
              const w = warnings(p);
              return (
                <tr
                  key={p.id}
                  className={cn("border-t border-border-soft", i % 2 ? "bg-muted" : "bg-surface")}
                >
                  <td className="p-2.5 font-semibold">
                    {p.noSep || <span className="text-destructive">Belum diisi</span>}
                  </td>
                  <td className="p-2.5">{p.tanggal}</td>
                  <td className="p-2.5">{p.tanggalPulang || "-"}</td>
                  <td className="p-2.5">{los(p) ?? "-"}</td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-1 font-semibold">
                      {p.nama}
                      {w.length > 0 && (
                        <AlertTriangle
                          className="h-3.5 w-3.5 text-destructive"
                          aria-label={w.join("; ")}
                        />
                      )}
                    </div>
                  </td>
                  <td className="p-2.5">{p.rm}</td>
                  <td className="p-2.5">{p.icd10 || "-"}</td>
                  <td className="p-2.5">{p.dpjp}</td>
                  <td className="p-2.5">{upgradeRoute(p)}</td>
                  <td className="p-2.5">{p.jenisNaikKelas}</td>
                  <td className="p-2.5">{p.namaPenjaminCob || "-"}</td>
                  <td className="p-2.5 text-right">{formatRp(p.tambahanNaikKelas)}</td>
                  <td className="p-2.5 text-right">{formatRp(p.inacbgs)}</td>
                  <td className="p-2.5 text-right">{formatRp(p.billing)}</td>
                  <td
                    className={cn(
                      "p-2.5 text-right font-semibold",
                      c.selisih < 0 ? "text-destructive" : "text-success",
                    )}
                  >
                    {formatRp(c.selisih)}
                  </td>
                  <td
                    className={cn(
                      "p-2.5 text-right font-semibold",
                      p.billing > 0 && (c.crr < 100 ? "text-destructive" : "text-success"),
                    )}
                  >
                    {p.billing > 0 ? formatPct(c.crr) : "-"}
                  </td>
                  <td
                    className={cn(
                      "p-2.5 text-right font-bold",
                      c.saving < 0 ? "text-destructive" : "text-success",
                    )}
                  >
                    {formatRp(c.saving)}
                  </td>
                  <td className={cn("p-2.5 text-right", c.sisaSdm < 0 && "text-destructive")}>
                    {formatRp(c.sdm)}
                  </td>
                  <td className={cn("p-2.5 text-right", c.sisaOps < 0 && "text-destructive")}>
                    {formatRp(c.ops)}
                  </td>
                  {!compact && (
                    <td className="no-print p-1.5">
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="soft" onClick={() => setDetail(p)}>
                          <Eye /> Detail
                        </Button>
                        {canEdit && (
                          <Button
                            size="icon"
                            variant="soft-orange"
                            className="h-8 w-8"
                            aria-label={`Edit ${p.nama}`}
                            onClick={() => onEdit?.(p)}
                          >
                            <Pencil />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="icon"
                            variant="soft-danger"
                            className="h-8 w-8"
                            aria-label={`Hapus ${p.nama}`}
                            onClick={() => onDelete?.(p)}
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!compact && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Menampilkan {rows.length ? page * pageSize + 1 : 0}-
            {Math.min((page + 1) * pageSize, rows.length)} dari {rows.length} pasien
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Halaman sebelumnya"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Halaman berikutnya"
              disabled={(page + 1) * pageSize >= rows.length}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
      <PatientDetail patient={detail} onClose={() => setDetail(null)} />
    </>
  );
}

function Row({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number | string;
  sub?: string | undefined;
  tone?: "good" | "bad" | undefined;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border-soft py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">
        {label}
        {sub && <span className="ml-1 text-[11px]">({sub})</span>}
      </span>
      <span
        className={cn(
          "tabular font-semibold",
          tone === "good" && "text-success",
          tone === "bad" && "text-destructive",
        )}
      >
        {typeof value === "number" ? formatRp(value) : value}
      </span>
    </div>
  );
}

export function PatientDetail({
  patient: p,
  onClose,
}: {
  patient: Patient | null;
  onClose: () => void;
}) {
  if (!p) return null;
  const c = calc(p);
  const w = warnings(p);
  const tone = (v: number) => (v < 0 ? "bad" : "good");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-primary">{p.nama}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            SEP {p.noSep || "Belum diisi"} · RM {p.rm} · {p.dpjp}
          </p>
        </DialogHeader>
        {w.length > 0 && (
          <div className="rounded-xl bg-destructive-soft p-3 text-xs font-semibold text-destructive">
            {w.map((x) => (
              <p key={x}>⚠ {x}</p>
            ))}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-card p-3">
            <h4 className="mb-1 text-sm font-bold">Ringkasan</h4>
            <Row label="Tanggal Masuk" value={p.tanggal} />
            <Row label="Tanggal Pulang" value={p.tanggalPulang || "-"} />
            <Row label="LOS" value={los(p) === null ? "-" : `${los(p)} hari`} />
            <Row label="ICD-10" value={p.icd10 || "-"} />
            <Row label="Rute Naik Kelas" value={upgradeRoute(p)} />
            <Row label="Jenis Naik Kelas" value={p.jenisNaikKelas} />
            <Row label="Penjamin COB" value={p.namaPenjaminCob || "-"} />
            <Row label="Tambahan" value={p.tambahanNaikKelas} />
            <Row label="Keterangan" value={p.keteranganNaikKelas || "-"} />
            <Row label="Total Pendapatan" value={c.totalPendapatan} />
            <Row label="INACBGs" value={p.inacbgs} />
            <Row label="Billing RS" value={p.billing} />
            <Row label="Selisih" value={c.selisih} tone={tone(c.selisih)} />
            <Row
              label="CRR"
              value={p.billing > 0 ? formatPct(c.crr) : "-"}
              tone={p.billing > 0 ? (c.crr < 100 ? "bad" : "good") : undefined}
            />
            <Row label="Investasi" sub="25%" value={c.investasi} />
            <Row label="Saving" value={c.saving} tone={tone(c.saving)} />
          </div>
          <div className="rounded-2xl bg-card p-3">
            <h4 className="mb-1 text-sm font-bold">
              SDM{" "}
              <span className="font-normal text-muted-foreground">
                · alokasi {formatRp(c.alokasiSdm)}
              </span>
            </h4>
            <Row label="Jasa DPJP" value={p.jasaDpjp} />
            <Row label="Dokter Umum" value={p.jasaDu} />
            <Row label="Penunjang" value={p.jasaPenunjang} />
            <Row label="Konsul Telp" value={p.konsul} />
            <Row label="Total SDM" value={c.sdm} />
            <Row label="Sisa SDM" value={c.sisaSdm} tone={tone(c.sisaSdm)} />
          </div>
          <div className="rounded-2xl bg-card p-3 md:col-span-2">
            <h4 className="mb-1 text-sm font-bold">
              Operasional{" "}
              <span className="font-normal text-muted-foreground">
                · alokasi {formatRp(c.alokasiOps)}
              </span>
            </h4>
            <div className="grid gap-x-6 md:grid-cols-2">
              <Row
                label="Farmasi"
                sub={`alokasi ${formatRp(p.inacbgs * ALOKASI.farmasi)}`}
                value={p.farmasi}
                tone={p.farmasi > p.inacbgs * ALOKASI.farmasi ? "bad" : undefined}
              />
              <Row
                label="Lab"
                sub={`alokasi ${formatRp(p.inacbgs * ALOKASI.lab)}`}
                value={p.lab}
                tone={p.lab > p.inacbgs * ALOKASI.lab ? "bad" : undefined}
              />
              <Row
                label="Radiologi"
                sub={`alokasi ${formatRp(p.inacbgs * ALOKASI.radiologi)}`}
                value={p.radiologi}
                tone={p.radiologi > p.inacbgs * ALOKASI.radiologi ? "bad" : undefined}
              />
              <Row
                label="Darah"
                sub={`maks ${formatRp(MAX_DARAH)}`}
                value={p.darah}
                tone={p.darah > MAX_DARAH ? "bad" : undefined}
              />
              <Row
                label="PA"
                sub={`maks ${formatRp(MAX_PA)}`}
                value={p.pa}
                tone={p.pa > MAX_PA ? "bad" : undefined}
              />
              <Row
                label="Ops Lainnya"
                sub={`alokasi ${formatRp(p.inacbgs * ALOKASI.opsLain)}`}
                value={p.opsLain}
                tone={p.opsLain > p.inacbgs * ALOKASI.opsLain ? "bad" : undefined}
              />
              <Row label="Total Ops" value={c.ops} />
              <Row label="Sisa Ops" value={c.sisaOps} tone={tone(c.sisaOps)} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
