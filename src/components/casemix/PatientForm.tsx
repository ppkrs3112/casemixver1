import { useSuspenseQuery } from "@tanstack/react-query";
import { Choice } from "./Choice";
import { PayerEditor } from "./PayerEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { payersQuery } from "@/lib/payers";
import { CLASSES, los, upgradeRoute, validatePatient } from "@/lib/casemix";
import { useEffect, useState } from "react";
import { AlertTriangle, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/casemix/MoneyInput";
import {
  ALOKASI,
  MAX_DARAH,
  MAX_PA,
  calc,
  emptyPatient,
  formatPct,
  formatRp,
  permissions,
  warnings,
  type Patient,
} from "@/lib/casemix";
import type { Account } from "@/lib/data";
import { cn } from "@/lib/utils";

export function PatientForm({
  me,
  editing,
  defaultDate,
  onSave,
  onCancelEdit,
}: {
  me: Account;
  editing: Patient | null;
  defaultDate: string;
  onSave: (p: Patient) => Promise<void>;
  onCancelEdit: () => void;
}) {
  const perm = permissions(me);
  const { data: payers } = useSuspenseQuery(payersQuery);
  const [addingPayer, setAddingPayer] = useState(false);
  const [p, setP] = useState<Patient>(() => editing ?? emptyPatient(defaultDate));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setP(editing ?? emptyPatient(defaultDate));
  }, [editing, defaultDate]);

  if (!perm.canInput) return null;
  const c = calc(p);
  const w = warnings(p);
  const set =
    <K extends keyof Patient>(k: K) =>
    (v: Patient[K]) =>
      setP((s) => ({ ...s, [k]: v }));

  async function submit() {
    const invalid = validatePatient(p);
    if (invalid) return void toast.error(invalid);
    if (!p.nama.trim()) return void toast.error("Nama pasien wajib diisi.");
    if (p.inacbgs <= 0) return void toast.error("INACBGs wajib diisi.");
    setSaving(true);
    try {
      await onSave(p);
      toast.success(editing ? "Data pasien diperbarui." : "Pasien tersimpan.");
      if (w.length) w.forEach((x) => toast.warning(x));
      if (!editing) setP(emptyPatient(p.tanggal));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="form-pasien" className="panel-card no-print scroll-mt-28 p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-primary md:text-lg">
          {editing ? `Edit Pasien: ${editing.nama}` : "Input Pasien Baru"}
        </h2>
        {editing && (
          <Button variant="ghost" size="sm" onClick={onCancelEdit}>
            <X /> Batal edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="f-sep" className="text-xs">
            No SEP *
          </Label>
          <Input
            id="f-sep"
            required
            value={p.noSep}
            onChange={(e) => set("noSep")(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-tgl" className="text-xs font-semibold text-muted-foreground">
            Tanggal Masuk
          </Label>
          <Input
            id="f-tgl"
            type="date"
            value={p.tanggal}
            onChange={(e) => set("tanggal")(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-nama" className="text-xs font-semibold text-muted-foreground">
            Nama Pasien
          </Label>
          <Input
            id="f-nama"
            value={p.nama}
            onChange={(e) => set("nama")(e.target.value)}
            placeholder="Nama lengkap"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-rm" className="text-xs font-semibold text-muted-foreground">
            No RM
          </Label>
          <Input
            id="f-rm"
            value={p.rm}
            onChange={(e) => set("rm")(e.target.value)}
            placeholder="RM000123"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-dpjp" className="text-xs font-semibold text-muted-foreground">
            DPJP
          </Label>
          <Input
            id="f-dpjp"
            value={p.dpjp}
            onChange={(e) => set("dpjp")(e.target.value)}
            placeholder="dr. … Sp.…"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-pulang" className="text-xs">
            Tanggal Pulang
          </Label>
          <Input
            id="f-pulang"
            type="date"
            min={p.tanggal}
            value={p.tanggalPulang}
            onChange={(e) => set("tanggalPulang")(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Lama Rawat (LOS)</Label>
          <p className="flex h-9 items-center font-semibold">
            {los(p) === null ? "-" : `${los(p)} hari`}
          </p>
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="f-icd" className="text-xs">
            ICD-10
          </Label>
          <Input
            id="f-icd"
            value={p.icd10}
            onChange={(e) => set("icd10")(e.target.value)}
            placeholder="A09, J18.9"
          />
        </div>
        <MoneyInput
          id="f-inacbgs"
          label="INACBGs"
          strong
          value={p.inacbgs}
          onChange={set("inacbgs")}
          className="col-span-2"
        />
        <MoneyInput
          id="f-billing"
          label={perm.billing ? "Billing RS Total" : "Billing RS Total (tidak ada akses)"}
          strong
          value={p.billing}
          onChange={set("billing")}
          disabled={!perm.billing}
          className="col-span-2"
        />
      </div>

      <fieldset className="mt-5 border-t border-border-soft pt-4">
        <legend className="text-sm font-bold text-primary">Naik Kelas</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          <Choice
            id="f-jenis"
            label="Jenis Naik Kelas"
            value={p.jenisNaikKelas}
            options={[
              { value: "Tidak", label: "Tidak Naik Kelas" },
              { value: "Biasa", label: "Naik Kelas Biasa (Bayar Sendiri)" },
              { value: "COB", label: "Naik Kelas COB" },
            ]}
            onChange={(v) =>
              setP((s) => ({
                ...s,
                jenisNaikKelas: v as Patient["jenisNaikKelas"],
                tambahanNaikKelas: v === "Tidak" ? 0 : s.tambahanNaikKelas,
                penjaminId: v === "COB" ? s.penjaminId : "",
                namaPenjaminCob: v === "Biasa" ? "Bayar Sendiri" : "",
                kelasTujuan: v === "Tidak" ? "" : s.kelasTujuan,
              }))
            }
          />
          <Choice
            id="f-awal"
            label="Kelas Awal"
            value={p.kelasAwal}
            onChange={set("kelasAwal")}
            options={CLASSES}
          />
          {p.jenisNaikKelas !== "Tidak" && (
            <Choice
              id="f-tujuan"
              label="Kelas Tujuan"
              value={p.kelasTujuan}
              onChange={set("kelasTujuan")}
              options={[{ value: "", label: "Pilih kelas tujuan" }, ...CLASSES]}
            />
          )}
          {p.jenisNaikKelas !== "Tidak" && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Rute Naik Kelas</Label>
                <p className="py-2 text-sm font-semibold">{upgradeRoute(p)}</p>
              </div>
              <MoneyInput
                id="f-tambahan"
                label="Tambahan Biaya Naik Kelas (Rp)"
                value={p.tambahanNaikKelas}
                onChange={set("tambahanNaikKelas")}
              />
              <div className="space-y-1">
                <Label htmlFor="f-keterangan" className="text-xs">
                  Keterangan Naik Kelas
                </Label>
                <Input
                  id="f-keterangan"
                  value={p.keteranganNaikKelas}
                  onChange={(e) => set("keteranganNaikKelas")(e.target.value)}
                />
              </div>
            </>
          )}
          {p.jenisNaikKelas === "COB" && (
            <div className="sm:col-span-2">
              <Choice
                id="f-penjamin"
                label="Pilih Penjamin COB"
                value={p.penjaminId}
                onChange={(id) => {
                  const payer = payers.find((x) => x.id === id);
                  setP((s) => ({ ...s, penjaminId: id, namaPenjaminCob: payer?.nama ?? "" }));
                }}
                options={[
                  { value: "", label: "Pilih penjamin" },
                  ...payers
                    .filter((x) => x.aktif || x.id === p.penjaminId)
                    .map((x) => ({ value: x.id, label: x.nama + (x.aktif ? "" : " (Nonaktif)") })),
                ]}
              />
              {perm.admin && (
                <Button variant="ghost" size="sm" onClick={() => setAddingPayer(true)}>
                  + Tambah Penjamin Baru
                </Button>
              )}
            </div>
          )}
        </div>
        {p.jenisNaikKelas !== "Tidak" &&
          CLASSES.indexOf(p.kelasTujuan) <= CLASSES.indexOf(p.kelasAwal) && (
            <p className="mt-2 text-sm font-semibold text-destructive">
              Kelas tujuan harus lebih tinggi dari kelas awal.
            </p>
          )}
        <p className="mt-3 text-sm font-bold">
          Total Pendapatan: <span className="text-primary">{formatRp(c.totalPendapatan)}</span>
        </p>
      </fieldset>
      <Dialog open={addingPayer} onOpenChange={setAddingPayer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Penjamin COB</DialogTitle>
          </DialogHeader>
          <PayerEditor
            onSaved={(payer) => {
              setP((s) => ({ ...s, penjaminId: payer.id, namaPenjaminCob: payer.nama }));
              setAddingPayer(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        {[
          ["SDM 40%", c.alokasiSdm],
          ["Ops 35%", c.alokasiOps],
          ["Investasi 25%", c.investasi],
          ["Farmasi 20%", p.inacbgs * ALOKASI.farmasi],
          ["Lab 1,75%", p.inacbgs * ALOKASI.lab],
          ["Radiologi 1,5%", p.inacbgs * ALOKASI.radiologi],
          ["Ops Lain 7%", p.inacbgs * ALOKASI.opsLain],
        ].map(([l, v]) => (
          <span
            key={l as string}
            className="tabular rounded-full bg-surface px-2.5 py-1 font-semibold"
          >
            {l}: <span className="text-primary">{formatRp(v as number)}</span>
          </span>
        ))}
      </div>
      <p className="tabular mt-2 text-sm font-bold">
        Selisih:{" "}
        <span className={c.selisih >= 0 ? "text-success" : "text-destructive"}>
          {formatRp(c.selisih)}
        </span>
        {p.billing > 0 && (
          <>
            {" "}
            · CRR{" "}
            <span className={c.crr >= 100 ? "text-success" : "text-destructive"}>
              {formatPct(c.crr)}
            </span>
          </>
        )}
        {" · "}Saving:{" "}
        <span className={c.saving >= 0 ? "text-success" : "text-destructive"}>
          {formatRp(c.saving)}
        </span>
      </p>

      {perm.sdm && (
        <fieldset className="mt-5">
          <legend className="mb-2 flex w-full items-center justify-between text-sm font-bold">
            <span>
              SDM Terpakai <span className="font-medium text-muted-foreground">· Alokasi 40%</span>
            </span>
            <Sisa value={c.sisaSdm} />
          </legend>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MoneyInput
              id="f-jdpjp"
              label="Jasa DPJP"
              value={p.jasaDpjp}
              onChange={set("jasaDpjp")}
            />
            <MoneyInput id="f-jdu" label="Dokter Umum" value={p.jasaDu} onChange={set("jasaDu")} />
            <MoneyInput
              id="f-jpen"
              label="Penunjang"
              value={p.jasaPenunjang}
              onChange={set("jasaPenunjang")}
            />
            <MoneyInput
              id="f-konsul"
              label="Konsul Telp"
              value={p.konsul}
              onChange={set("konsul")}
            />
          </div>
        </fieldset>
      )}

      {perm.ops && (
        <fieldset className="mt-5">
          <legend className="mb-2 flex w-full items-center justify-between text-sm font-bold">
            <span>
              Operasional Terpakai{" "}
              <span className="font-medium text-muted-foreground">· Alokasi 35%</span>
            </span>
            <Sisa value={c.sisaOps} />
          </legend>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <MoneyInput
              id="f-farmasi"
              label="Farmasi"
              value={p.farmasi}
              onChange={set("farmasi")}
              hint={`Alokasi 20%: ${formatRp(p.inacbgs * ALOKASI.farmasi)}`}
              warn={p.farmasi > p.inacbgs * ALOKASI.farmasi && p.inacbgs > 0}
            />
            <MoneyInput
              id="f-lab"
              label="Lab"
              value={p.lab}
              onChange={set("lab")}
              hint={`Alokasi 1,75%: ${formatRp(p.inacbgs * ALOKASI.lab)}`}
              warn={p.lab > p.inacbgs * ALOKASI.lab && p.inacbgs > 0}
            />
            <MoneyInput
              id="f-rad"
              label="Radiologi"
              value={p.radiologi}
              onChange={set("radiologi")}
              hint={`Alokasi 1,5%: ${formatRp(p.inacbgs * ALOKASI.radiologi)}`}
              warn={p.radiologi > p.inacbgs * ALOKASI.radiologi && p.inacbgs > 0}
            />
            <MoneyInput
              id="f-darah"
              label="Darah"
              value={p.darah}
              onChange={set("darah")}
              hint={
                p.darah > MAX_DARAH
                  ? `Melebihi batas ${formatRp(MAX_DARAH)}!`
                  : `Maks ${formatRp(MAX_DARAH)}`
              }
              warn={p.darah > MAX_DARAH}
            />
            <MoneyInput
              id="f-pa"
              label="PA"
              value={p.pa}
              onChange={set("pa")}
              hint={
                p.pa > MAX_PA ? `Melebihi batas ${formatRp(MAX_PA)}!` : `Maks ${formatRp(MAX_PA)}`
              }
              warn={p.pa > MAX_PA}
            />
            <MoneyInput
              id="f-lain"
              label="Ops Lainnya"
              value={p.opsLain}
              onChange={set("opsLain")}
              hint={`Alokasi 7%: ${formatRp(p.inacbgs * ALOKASI.opsLain)}`}
              warn={p.opsLain > p.inacbgs * ALOKASI.opsLain && p.inacbgs > 0}
            />
          </div>
        </fieldset>
      )}

      {w.length > 0 && (
        <div className="mt-4 space-y-1 rounded-xl bg-destructive-soft p-3 text-xs font-semibold text-destructive">
          {w.map((x) => (
            <p key={x} className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> {x}
            </p>
          ))}
        </div>
      )}

      <Button size="lg" className="mt-5 w-full" onClick={submit} disabled={saving}>
        <Save /> {saving ? "Menyimpan…" : editing ? "Simpan Perubahan" : "Simpan Pasien"}
      </Button>
    </section>
  );
}

function Sisa({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "tabular rounded-full px-2.5 py-0.5 text-[11px]",
        value < 0 ? "bg-destructive-soft text-destructive" : "bg-success-soft text-success",
      )}
    >
      {value < 0 ? "Over " : "Sisa "}
      {formatRp(Math.abs(value))}
    </span>
  );
}
