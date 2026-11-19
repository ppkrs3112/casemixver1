import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/casemix/AppHeader";
import { PayerEditor } from "@/components/casemix/PayerEditor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { meQuery } from "@/lib/data";
import { payersQuery, deletePayer, type Payer } from "@/lib/payers";
export const Route = createFileRoute("/_authenticated/pengaturan")({
  head: () => ({
    meta: [
      { title: "Pengaturan Penjamin COB — Casemix RS V4" },
      {
        name: "description",
        content: "Kelola perusahaan, asuransi, kontak dan status penjamin COB rumah sakit.",
      },
      { property: "og:title", content: "Pengaturan Penjamin COB — Casemix RS V4" },
      {
        property: "og:description",
        content: "Master perusahaan dan asuransi penjamin COB rumah sakit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(meQuery),
      context.queryClient.ensureQueryData(payersQuery),
    ]),
  component: Settings,
});
function Settings() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: payers } = useSuspenseQuery(payersQuery);
  const qc = useQueryClient();
  const [editor, setEditor] = useState<Payer | null | undefined>(undefined);
  async function remove(p: Payer) {
    if (!window.confirm(`Hapus penjamin ${p.nama}?`)) return;
    try {
      await deletePayer(p.id);
      await qc.invalidateQueries({ queryKey: ["payers"] });
      toast.success("Penjamin dihapus.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus");
    }
  }
  if (!me) return null;
  return (
    <main className="mx-auto max-w-7xl px-3 py-3 md:px-6 md:py-6">
      <AppHeader me={me} active="pengaturan" />
      <h2 className="mb-4 font-display text-2xl text-primary">Pengaturan · Kelola Penjamin COB</h2>
      {me.role !== "Admin" ? (
        <p>Menu ini khusus Admin.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap justify-between gap-3">
            <Button onClick={() => setEditor(null)}>
              <Plus />
              Tambah Penjamin
            </Button>
            <Button variant="outline" asChild>
              <Link to="/akun">Kelola Akun</Link>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  {["Nama Perusahaan / Asuransi", "Jenis", "No Telp / PIC", "Status", "Aksi"].map(
                    (h) => (
                      <th key={h} className="p-3 text-left">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {payers.map((p) => (
                  <tr key={p.id} className="border-b border-border-soft">
                    <td className="p-3 font-semibold">{p.nama}</td>
                    <td className="p-3">{p.jenis}</td>
                    <td className="p-3">{p.kontak || "-"}</td>
                    <td className="p-3">{p.aktif ? "Aktif" : "Nonaktif"}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          variant="soft"
                          size="icon"
                          aria-label={`Edit ${p.nama}`}
                          onClick={() => setEditor(p)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="soft-danger"
                          size="icon"
                          aria-label={`Hapus ${p.nama}`}
                          onClick={() => remove(p)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!payers.length && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      Belum ada penjamin COB.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Dialog
            open={editor !== undefined}
            onOpenChange={(o) => {
              if (!o) setEditor(undefined);
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editor ? "Edit" : "Tambah"} Penjamin COB</DialogTitle>
              </DialogHeader>
              {editor !== undefined && (
                <PayerEditor
                  key={editor?.id ?? "new"}
                  payer={editor ?? undefined}
                  onSaved={() => setEditor(undefined)}
                />
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </main>
  );
}
