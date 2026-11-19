import { Link, useNavigate } from "@tanstack/react-router";
import { FileText, LayoutDashboard, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { permissions } from "@/lib/casemix";
import type { Account } from "@/lib/data";
import { cn } from "@/lib/utils";

export function AppHeader({ me, active }: { me: Account; active: "dashboard" | "laporan" | "akun" }) {
  const navigate = useNavigate();
  const perm = permissions(me);
  const aksesList = [
    perm.sdm && "SDM",
    perm.ops && "Ops",
    perm.billing && "Billing",
    perm.hapus && "Hapus",
    perm.export && "Export",
  ].filter(Boolean) as string[];

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const nav = [
    { key: "dashboard", to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    { key: "laporan", to: "/laporan", label: "Laporan", icon: FileText, show: true },
    { key: "akun", to: "/akun", label: "Kelola Akun", icon: Users, show: perm.admin },
  ] as const;

  return (
    <header className="no-print mb-4 md:mb-6">
      <div className="bg-hero rounded-3xl p-4 text-primary-foreground shadow-lift md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl leading-none md:text-3xl">Casemix RS V4</h1>
            <p className="mt-1.5 truncate text-xs text-primary-foreground/85 md:text-sm">
              Halo, <b>{me.nama || me.user}</b> · {me.role}
              <span className="hidden sm:inline"> · Akses: {aksesList.length ? aksesList.join(", ") : "Lihat saja"}</span>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25 hover:text-primary-foreground">
            <LogOut /> Keluar
          </Button>
        </div>
        <nav className="mt-4 flex gap-1.5 overflow-x-auto">
          {nav.filter((n) => n.show).map((n) => (
            <Link
              key={n.key}
              to={n.to}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors md:text-sm",
                active === n.key
                  ? "bg-surface text-primary"
                  : "bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20",
              )}
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
