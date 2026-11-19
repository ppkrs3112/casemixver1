import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Choice } from "./Choice";
import { savePayer, type Payer } from "@/lib/payers";
export function PayerEditor({
  payer,
  onSaved,
}: {
  payer?: Payer | undefined;
  onSaved: (p: Payer) => void;
}) {
  const qc = useQueryClient();
  const [nama, setNama] = useState(payer?.nama ?? "");
  const [jenis, setJenis] = useState(payer?.jenis ?? "Asuransi Swasta");
  const [kontak, setKontak] = useState(payer?.kontak ?? "");
  const [aktif, setAktif] = useState(payer?.aktif ?? true);
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      const p = await savePayer({ id: payer?.id, nama, jenis, kontak, aktif });
      await qc.invalidateQueries({ queryKey: ["payers"] });
      toast.success("Penjamin tersimpan.");
      onSaved(p);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="payer-name">Nama Perusahaan / Asuransi</Label>
        <Input id="payer-name" value={nama} onChange={(e) => setNama(e.target.value)} />
      </div>
      <Choice
        id="payer-type"
        label="Jenis"
        value={jenis}
        onChange={setJenis}
        options={["Asuransi Swasta", "Perusahaan", "Jaminan Lain"]}
      />
      <div className="space-y-1">
        <Label htmlFor="payer-contact">No Telp / PIC (opsional)</Label>
        <Input id="payer-contact" value={kontak} onChange={(e) => setKontak(e.target.value)} />
      </div>
      <Choice
        id="payer-status"
        label="Status"
        value={aktif ? "Aktif" : "Nonaktif"}
        onChange={(v) => setAktif(v === "Aktif")}
        options={["Aktif", "Nonaktif"]}
      />
      <Button onClick={submit} disabled={busy}>
        <Save />
        {busy ? "Menyimpan…" : "Simpan Penjamin"}
      </Button>
    </div>
  );
}
