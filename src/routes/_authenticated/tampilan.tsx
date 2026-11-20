import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Eye, Save, Upload, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Choice } from "@/components/casemix/Choice";
import { AppearancePreview } from "@/components/casemix/AppearancePreview";
import { useAppearance, DEFAULT_APPEARANCE, validateLogo, type Appearance } from "@/lib/appearance";
import { meQuery } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/_authenticated/tampilan")({
  head: () => ({
    meta: [
      { title: "Pengaturan Tampilan — Casemix RS" },
      {
        name: "description",
        content: "Atur logo rumah sakit, warna aplikasi dan halaman login Casemix.",
      },
      { property: "og:title", content: "Pengaturan Tampilan — Casemix RS" },
      { property: "og:description", content: "Logo, warna dan halaman login Casemix rumah sakit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppearancePage,
});
function AppearancePage() {
  const { data: me } = useSuspenseQuery(meQuery);
  return me?.role === "Admin" ? <Editor /> : <p className="p-6">Menu ini khusus Admin.</p>;
}
function Editor() {
  const { appearance, savedAppearance, preview, save } = useAppearance();
  const [form, setForm] = useState<Appearance>(appearance);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const upload = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!dirty) setForm(savedAppearance); }, [savedAppearance, dirty]);
  useEffect(() => () => preview(null), [preview]);
  function set<K extends keyof Appearance>(key: K, value: Appearance[K]) {
    const next = { ...form, [key]: value };
    setForm(next);
    setDirty(true);
    preview(next);
  }
  async function logo(file: File) {
    const err = validateLogo(file);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    try {
      const path = `logos/${crypto.randomUUID()}.${file.type === "image/png" ? "png" : "jpg"}`;
      const { error } = await supabase.storage
        .from("hospital-branding")
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const next = { ...form, logo: data, logoPath: path };
      setForm(next);
      setDirty(true);
      preview(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload logo gagal");
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    setBusy(true);
    try {
      await save(form);
      setDirty(false);
      setShowPreview(false);
      toast.success("Pengaturan Tampilan Berhasil Disimpan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }
  const text = (
    key: "name" | "subtitle" | "version" | "loginTitle" | "loginSubtitle" | "note" | "footer",
    label: string,
    area = false,
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`a-${key}`}>{label}</Label>
      {area ? (
        <Textarea id={`a-${key}`} value={form[key]} onChange={(e) => set(key, e.target.value)} />
      ) : (
        <Input id={`a-${key}`} value={form[key]} onChange={(e) => set(key, e.target.value)} />
      )}
    </div>
  );
  const color = (
    key: "primary" | "secondary" | "gradientLeft" | "gradientRight" | "background",
    label: string,
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`a-${key}`}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={`a-${key}`}
          type="color"
          aria-label={label}
          className="h-10 w-14 shrink-0 p-1"
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
        />
        <Input
          aria-label={`${label} hex`}
          value={form[key]}
          onChange={(e) => {
            const v = e.target.value;
            setForm({ ...form, [key]: v });
            setDirty(true);
            if (/^#[0-9a-f]{6}$/i.test(v)) set(key, v);
          }}
        />
      </div>
    </div>
  );
  return (
    <main className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pengaturan Tampilan</h1>
          <p className="mt-1 text-sm text-muted-foreground">Identitas Rumah Sakit</p>
        </div>
        <Button variant="outline" onClick={() => setShowPreview(true)}>
          <Eye />
          Preview
        </Button>
      </div>
      <section className="space-y-4 border-t border-border-soft pt-5">
        <h2 className="font-bold">Logo & Nama RS</h2>
        <div className="flex flex-wrap items-center gap-4">
          {form.logo && <img src={form.logo} alt="Logo RS" className="h-20 w-20 object-contain" />}
          <Button variant="outline" disabled={busy} onClick={() => upload.current?.click()}>
            <Upload />
            Upload Logo
          </Button>
          <Button
            variant="ghost"
            disabled={!form.logo}
            onClick={() => {
              const next = { ...form, logo: "", logoPath: "" };
              setForm(next);
              preview(next);
              setDirty(true);
            }}
          >
            <Trash2 />
            Hapus Logo
          </Button>
          <input
            ref={upload}
            type="file"
            accept="image/png,image/jpeg"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) logo(f);
              e.target.value = "";
            }}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {text("name", "Nama RS")}
          {text("subtitle", "Sub Judul RS")}
          {text("version", "Versi Aplikasi")}
        </div>
      </section>
      <section className="space-y-4 border-t border-border-soft pt-5">
        <h2 className="font-bold">Warna & Gradasi</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {color("primary", "Warna Utama")}
          {color("secondary", "Warna Kedua")}
          {color("background", "Background Dashboard")}
          {color("gradientLeft", "Gradasi Warna Kiri")}
          {color("gradientRight", "Gradasi Warna Kanan")}
          <Choice
            id="a-direction"
            label="Arah Gradasi"
            value={form.direction}
            onChange={(v) => set("direction", v)}
            options={["Kiri ke Kanan", "Atas ke Bawah", "Diagonal"]}
          />
        </div>
        <div className="bg-hero h-24 rounded-lg" aria-label="Preview gradasi login" />
        <Button
          variant="outline"
          onClick={() => {
            const next = {
              ...form,
              primary: DEFAULT_APPEARANCE.primary,
              secondary: DEFAULT_APPEARANCE.secondary,
              background: DEFAULT_APPEARANCE.background,
              gradientLeft: DEFAULT_APPEARANCE.gradientLeft,
              gradientRight: DEFAULT_APPEARANCE.gradientRight,
              direction: DEFAULT_APPEARANCE.direction,
            };
            setForm(next);
            preview(next);
            setDirty(true);
          }}
        >
          <RotateCcw />
          Reset ke Warna Default
        </Button>
      </section>
      <section className="space-y-4 border-t border-border-soft pt-5">
        <h2 className="font-bold">Halaman Login</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {text("loginTitle", "Judul Besar Login")}
          {text("loginSubtitle", "Sub Judul Login", true)}
          <div className="md:col-span-2">{text("note", "Note / Pengumuman Awal", true)}</div>
          {text("footer", "Footer Login")}
        </div>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-3">
            <Switch
              id="show-note"
              checked={form.showNote}
              onCheckedChange={(v) => set("showNote", v)}
            />
            <Label htmlFor="show-note">Tampilkan Note?</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="show-accounts"
              checked={form.showAccounts}
              onCheckedChange={(v) => set("showAccounts", v)}
            />
            <Label htmlFor="show-accounts">Tampilkan Akun Awal?</Label>
          </div>
        </div>
      </section>
      <div className="flex flex-wrap gap-3 border-t border-border-soft pt-5">
        <Button disabled={busy || !dirty} onClick={submit}>
          <Save />
          {busy ? "Menyimpan…" : "Simpan Pengaturan Tampilan"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            preview(null);
            setForm(savedAppearance);
            setDirty(false);
          }}
        >
          Batal / Reset
        </Button>
      </div>
      <AppearancePreview open={showPreview} onOpenChange={setShowPreview} form={form} busy={busy} onSave={submit} />
    </main>
  );
}
