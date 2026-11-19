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
import { useAppearance } from "@/lib/appearance";
import { usernameToEmail } from "@/lib/casemix";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Masuk — Casemix RS V4" },
      {
        name: "description",
        content:
          "Masuk ke Casemix RS V4 untuk memantau INACBGs, billing, saving, dan CRR rumah sakit.",
      },
      { property: "og:title", content: "Masuk — Casemix RS V4" },
      {
        property: "og:description",
        content:
          "Masuk ke Casemix RS V4 untuk memantau INACBGs, billing, saving, dan CRR rumah sakit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { appearance: a } = useAppearance();
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
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    setLoading(false);
    if (error) return void toast.error("Username / password salah.");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <section className="w-full max-w-md overflow-hidden rounded-lg border border-border-soft bg-surface shadow-lift">
        <div className="bg-hero px-6 py-7 text-center text-primary-foreground">
          {a.logo ? (
            <img
              src={a.logo}
              alt={`Logo ${a.name}`}
              className="mx-auto mb-3 h-16 w-16 object-contain"
            />
          ) : (
            <Activity className="mx-auto mb-3 h-10 w-10" />
          )}
          <p className="mb-2 text-sm font-bold">
            {a.name} · {a.version}
          </p>
          <h1 className="break-words text-2xl font-extrabold">{a.loginTitle}</h1>
          <p className="mt-2 whitespace-pre-line text-sm">{a.loginSubtitle}</p>
        </div>
        <div className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              <LogIn />
              {loading ? "Memeriksa…" : "Masuk"}
            </Button>
          </form>
          {a.showNote && (
            <p className="mt-5 whitespace-pre-line rounded-lg bg-primary-soft p-3 text-xs leading-relaxed">
              {a.note}
            </p>
          )}
          {a.showAccounts && (
            <div className="mt-4 rounded-lg bg-secondary-soft p-3 text-xs">
              <p className="font-bold">Akun awal</p>
              <p>Admin: admin / admin123</p>
              <p>Staff SDM: staff-sdm / sdm123</p>
              <p>Direksi: direksi / lihat123</p>
            </div>
          )}
          <p className="mt-6 text-center text-[11px] text-muted-foreground">{a.footer}</p>
        </div>
      </section>
    </div>
  );
}
