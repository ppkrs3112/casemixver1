import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { Activity, LockKeyhole, LogIn, PieChart, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ensureDefaultAccounts } from "@/lib/accounts.functions";
import { usernameToEmail } from "@/lib/casemix";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Masuk — Casemix RS V4" },
      { name: "description", content: "Masuk ke Casemix RS V4 untuk memantau INACBGs, billing, saving, dan CRR rumah sakit." },
      { property: "og:title", content: "Masuk — Casemix RS V4" },
      { property: "og:description", content: "Masuk ke Casemix RS V4 untuk memantau INACBGs, billing, saving, dan CRR rumah sakit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const ensure = useServerFn(ensureDefaultAccounts);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
    ensure().catch(() => undefined);
  }, [navigate, ensure]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return void toast.error("Isi username dan password.");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
    setLoading(false);
    if (error) return void toast.error("Username / password salah.");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-soft">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-4 py-8 md:grid-cols-2 md:gap-12 md:px-8">
        <section className="bg-hero relative overflow-hidden rounded-[2rem] p-7 text-primary-foreground shadow-lift md:p-10">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary-foreground/10" aria-hidden />
          <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-primary-foreground/10" aria-hidden />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold">
              <Activity className="h-3.5 w-3.5" /> Casemix Rumah Sakit
            </span>
            <h1 className="mt-5 font-display text-4xl leading-tight md:text-5xl">Casemix RS V4</h1>
            <p className="mt-3 max-w-sm text-sm text-primary-foreground/85 md:text-base">
              Pantau INACBGs, billing, saving, dan CRR per DPJP — lengkap dengan alokasi SDM 40%, Operasional 35%, dan Investasi 25%.
            </p>
            <ul className="mt-6 hidden space-y-3 text-sm md:block">
              {[
                [PieChart, "7 grafik dengan insight otomatis"],
                [ShieldCheck, "Hak akses per akun: Admin, Inputer, Viewer"],
                [LockKeyhole, "Data tim tersimpan aman dan sama di semua perangkat"],
              ].map(([Icon, text]) => {
                const I = Icon as typeof PieChart;
                return (
                  <li key={text as string} className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-foreground/15">
                      <I className="h-4 w-4" />
                    </span>
                    {text as string}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="panel mx-auto w-full max-w-md p-6 md:p-8">
          <h2 className="text-xl font-bold">Masuk Tim</h2>
          <p className="mt-1 text-sm text-muted-foreground">Gunakan akun yang diberikan Admin.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input id="username" autoComplete="username" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="contoh: admin" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              <LogIn /> {loading ? "Memeriksa…" : "Masuk"}
            </Button>
          </form>
          <div className="mt-6 rounded-2xl bg-secondary-soft p-4 text-xs leading-relaxed">
            <p className="font-bold">Akun awal</p>
            <p>Admin: <b>admin</b> / admin123</p>
            <p>Staff SDM: <b>staff-sdm</b> / sdm123</p>
            <p>Direksi (lihat saja): <b>direksi</b> / lihat123</p>
            <p className="mt-2 text-muted-foreground">Segera ganti password di menu Kelola Akun.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
