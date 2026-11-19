import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Save, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/casemix/AppHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAccount, deleteAccount, updateAccount } from "@/lib/accounts.functions";
import { presetAkses, type Akses, type Role } from "@/lib/casemix";
import { accountsQuery, meQuery, type Account } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/akun")({
  head: () => ({
    meta: [
      { title: "Kelola Akun — Casemix RS V4" },
      { name: "description", content: "Kelola akun tim Casemix: buat akun, atur role dan hak akses input, hapus, dan export." },
      { property: "og:title", content: "Kelola Akun — Casemix RS V4" },
      { property: "og:description", content: "Kelola akun tim Casemix: buat akun, atur role dan hak akses input, hapus, dan export." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  component: AkunPage,
});

const AKSES_LABEL: [keyof Akses, string][] = [
  ["sdm", "Boleh Input SDM"],
  ["ops", "Boleh Input Operasional"],
  ["billing", "Boleh Input Billing"],
  ["hapus", "Boleh Hapus Data"],
  ["export", "Boleh Export"],
];
const ROLES: Role[] = ["Admin", "Inputer", "Viewer"];
const sel = "h-10 w-full rounded-xl border border-input bg-surface px-3 text-sm";

function AksesBoxes({ value, onChange, role, idPrefix }: { value: Akses; onChange: (a: Akses) => void; role: Role; idPrefix: string }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {AKSES_LABEL.map(([k, label]) => {
        const locked = role === "Viewer" && k !== "export";
        return (
          <label key={k} htmlFor={`${idPrefix}-${k}`} className={cn("flex items-center gap-2 text-sm", locked && "opacity-50")}>
            <Checkbox id={`${idPrefix}-${k}`} checked={value[k] && !locked} disabled={locked} onCheckedChange={(c) => onChange({ ...value, [k]: c === true })} />
            {label}
          </label>
        );
      })}
    </div>
  );
}

function AkunPage() {
  const { data: me } = useSuspenseQuery(meQuery);
  if (!me) return null;
  if (me.role !== "Admin") {
    return (
      <main className="mx-auto max-w-5xl px-3 py-3 md:px-6 md:py-6">
        <AppHeader me={me} active="akun" />
        <div className="panel p-6 text-center">
          <p className="font-semibold">Menu ini khusus Admin.</p>
          <Link to="/dashboard" className="mt-3 inline-block text-sm font-semibold text-primary underline">Kembali ke Dashboard</Link>
        </div>
      </main>
    );
  }
  return <AdminAccounts me={me} />;
}

function AdminAccounts({ me }: { me: Account }) {
  const qc = useQueryClient();
  const { data: accounts = [], isLoading } = useQuery(accountsQuery);
  const create = useServerFn(createAccount);
  const [form, setForm] = useState({ username: "", password: "", nama: "", role: "Inputer" as Role, akses: presetAkses("Inputer") });
  const [busy, setBusy] = useState(false);

  async function onCreate() {
    setBusy(true);
    try {
      await create({ data: form });
      toast.success(`Akun ${form.username} berhasil dibuat.`);
      setForm({ username: "", password: "", nama: "", role: "Inputer", akses: presetAkses("Inputer") });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-3 py-3 md:px-6 md:py-6">
      <AppHeader me={me} active="akun" />

      <section className="panel-card mb-5 p-4 md:p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-primary"><UserPlus className="h-5 w-5" /> Buat Akun Baru & Atur Hak Akses</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="n-user" className="text-xs">Username</Label>
            <Input id="n-user" autoCapitalize="none" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="contoh: staff-ops" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="n-pass" className="text-xs">Password</Label>
            <Input id="n-pass" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min. 6 karakter" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="n-nama" className="text-xs">Nama Lengkap</Label>
            <Input id="n-nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Nama tampilan" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="n-role" className="text-xs">Role</Label>
            <select id="n-role" className={sel} value={form.role} onChange={(e) => { const r = e.target.value as Role; setForm({ ...form, role: r, akses: presetAkses(r) }); }}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <AksesBoxes idPrefix="new" role={form.role} value={form.akses} onChange={(akses) => setForm({ ...form, akses })} />
        </div>
        <Button className="mt-4" onClick={onCreate} disabled={busy}><UserPlus /> {busy ? "Membuat…" : "Tambah Akun"}</Button>
        <p className="mt-2 text-[11px] text-muted-foreground">Viewer hanya bisa melihat dashboard, grafik, dan export. Hak yang tidak dicentang disembunyikan / dikunci di form input.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold">Daftar Akun <span className="text-sm font-medium text-muted-foreground">· {accounts.length}</span></h2>
        {isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
        {accounts.map((a) => <AccountRow key={a.id} account={a} isSelf={a.id === me.id} />)}
      </section>
    </main>
  );
}

function AccountRow({ account, isSelf }: { account: Account; isSelf: boolean }) {
  const qc = useQueryClient();
  const update = useServerFn(updateAccount);
  const remove = useServerFn(deleteAccount);
  const [nama, setNama] = useState(account.nama);
  const [role, setRole] = useState<Role>(account.role);
  const [akses, setAkses] = useState<Akses>(account.akses);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const dirty = nama !== account.nama || role !== account.role || JSON.stringify(akses) !== JSON.stringify(account.akses) || password.length > 0;

  async function save() {
    setBusy(true);
    try {
      await update({ data: { userId: account.id, nama, role, akses, password: password || undefined } });
      toast.success(`Akun ${account.user} diperbarui.`);
      setPassword("");
      qc.invalidateQueries({ queryKey: ["accounts"] });
      if (isSelf) qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!window.confirm(`Hapus akun ${account.user}?`)) return;
    setBusy(true);
    try {
      await remove({ data: { userId: account.id } });
      toast.success("Akun dihapus.");
      qc.invalidateQueries({ queryKey: ["accounts"] });
    } catch (e) {
      toast.error(errorText(e));
      setBusy(false);
    }
  }

  return (
    <div className="panel p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-bold">{account.user}</span>
        <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", role === "Admin" ? "bg-primary text-primary-foreground" : role === "Inputer" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground")}>{role}</span>
        {isSelf && <span className="text-[11px] text-muted-foreground">(akun Anda)</span>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={`nama-${account.id}`} className="text-xs">Nama</Label>
          <Input id={`nama-${account.id}`} value={nama} onChange={(e) => setNama(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`role-${account.id}`} className="text-xs">Role</Label>
          <select id={`role-${account.id}`} className={sel} value={role} disabled={isSelf} onChange={(e) => { const r = e.target.value as Role; setRole(r); setAkses(presetAkses(r)); }}>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`pass-${account.id}`} className="text-xs">Password baru (opsional)</Label>
          <Input id={`pass-${account.id}`} type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kosongkan jika tidak diganti" />
        </div>
      </div>
      <div className="mt-3">
        <AksesBoxes idPrefix={account.id} role={role} value={akses} onChange={setAkses} />
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={save} disabled={!dirty || busy}><Save /> Simpan</Button>
        {!isSelf && <Button size="sm" variant="soft-danger" onClick={del} disabled={busy}><Trash2 /> Hapus Akun</Button>}
      </div>
    </div>
  );
}

function errorText(e: unknown) {
  if (e instanceof Error) {
    try {
      const parsed = JSON.parse(e.message);
      if (Array.isArray(parsed) && parsed[0]?.message) return parsed[0].message as string;
    } catch {
      /* not a validation error */
    }
    return e.message;
  }
  return "Terjadi kesalahan.";
}
