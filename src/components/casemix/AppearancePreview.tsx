import { Activity, LayoutDashboard, TrendingUp, Users, FileText, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Appearance } from "@/lib/appearance";

const angle = (d: string) => (d === "Kiri ke Kanan" ? "90deg" : d === "Atas ke Bawah" ? "180deg" : "135deg");
const soft = (c: string) => `color-mix(in srgb, ${c} 12%, white)`;

export function AppearancePreview({
  open, onOpenChange, form, busy, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: Appearance;
  busy: boolean;
  onSave: () => void;
}) {
  const menu = [
    { label: "Dashboard", icon: LayoutDashboard, active: true },
    { label: "Dashboard Naik Kelas", icon: TrendingUp },
    { label: "Daftar Pasien", icon: Users },
    { label: "Laporan", icon: FileText },
    { label: "Pengaturan", icon: Settings },
  ];
  const logo = form.logo ? (
    <img src={form.logo} alt="Logo RS" className="h-9 w-9 object-contain" />
  ) : (
    <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: soft(form.primary), color: form.primary }}>
      <Activity className="h-5 w-5" />
    </span>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Preview Tampilan</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="dashboard">
          <TabsList className="grid h-auto w-full grid-cols-2">
            <TabsTrigger value="dashboard" className="whitespace-normal">Preview Sidebar & Dashboard</TabsTrigger>
            <TabsTrigger value="login" className="whitespace-normal">Preview Halaman Login</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard">
            <div className="flex overflow-hidden rounded-lg border border-border-soft" style={{ background: form.background }}>
              <aside className="w-40 shrink-0 border-r border-border-soft bg-surface sm:w-52">
                <div className="flex items-center gap-2 border-b border-border-soft p-3">
                  {logo}
                  <div className="min-w-0">
                    <p className="break-words text-sm font-extrabold uppercase leading-tight">{form.name}</p>
                    <p className="text-[10px] text-muted-foreground">{form.subtitle}</p>
                  </div>
                </div>
                <nav className="py-2">
                  {menu.map((m) => (
                    <div key={m.label} className="flex items-center gap-2 border-l-[3px] px-3 py-2 text-xs"
                      style={m.active ? { borderColor: form.primary, background: soft(form.primary), color: form.primary, fontWeight: 700 } : { borderColor: "transparent" }}>
                      <m.icon className="h-3.5 w-3.5 shrink-0" />{m.label}
                    </div>
                  ))}
                </nav>
              </aside>
              <div className="min-w-0 flex-1 space-y-3 p-3">
                <p className="text-sm font-extrabold">Dashboard Casemix</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[["Total Pasien", "84"], ["Total Pendapatan", "Rp 1,2 M"]].map(([k, v], i) => (
                    <div key={k} className="rounded-lg border border-border-soft bg-surface p-3">
                      <p className="text-[11px] text-muted-foreground">{k}</p>
                      <p className="text-lg font-extrabold" style={{ color: i ? form.secondary : form.primary }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-md px-3 py-2 text-xs font-semibold text-primary-foreground" style={{ background: form.primary }}>Tombol Magenta</span>
                  <span className="rounded-md px-3 py-2 text-xs font-semibold text-primary-foreground" style={{ background: form.secondary }}>Tombol Orange</span>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="login">
            <div className="grid min-h-80 place-items-center rounded-lg p-4"
              style={{ background: `linear-gradient(${angle(form.direction)}, ${form.gradientLeft}, ${form.gradientRight})` }}>
              <div className="w-full max-w-xs space-y-3 rounded-xl bg-surface p-5 text-center shadow-lg">
                <div className="flex justify-center">{logo}</div>
                <p className="text-lg font-extrabold">{form.loginTitle}</p>
                <p className="text-xs text-muted-foreground">{form.loginSubtitle}</p>
                <div className="h-8 rounded-md border border-border-soft" />
                <div className="h-8 rounded-md border border-border-soft" />
                <div className="rounded-md py-2 text-xs font-semibold text-primary-foreground" style={{ background: form.primary }}>Masuk</div>
                {form.showNote && form.note && <p className="rounded-md p-2 text-left text-[11px]" style={{ background: soft(form.primary) }}>{form.note}</p>}
                <p className="text-[10px] text-muted-foreground">{form.footer}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex flex-wrap justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline"><X />Tutup Preview</Button>
          </DialogClose>
          <Button disabled={busy} onClick={onSave}>{busy ? "Menyimpan…" : "Simpan & Terapkan"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
