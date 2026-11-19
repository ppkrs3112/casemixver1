import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  Activity,
  LayoutDashboard,
  TrendingUp,
  Users,
  FileText,
  Building2,
  Settings,
  Palette,
  LogOut,
  Menu,
  ChevronsLeft,
  ChevronsRight,
  Bell,
  Search,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { meQuery } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { useAppearance } from "@/lib/appearance";
import { cn } from "@/lib/utils";
const nav = [
  {
    to: "/dashboard",
    label: "Dashboard",
    title: "Dashboard Casemix",
    icon: LayoutDashboard,
    admin: false,
  },
  {
    to: "/naik-kelas",
    label: "Dashboard Naik Kelas",
    title: "Dashboard Naik Kelas",
    icon: TrendingUp,
    admin: false,
  },
  { to: "/pasien", label: "Daftar Pasien", title: "Daftar Pasien", icon: Users, admin: false },
  { to: "/laporan", label: "Laporan", title: "Laporan", icon: FileText, admin: false },
  {
    to: "/pengaturan",
    label: "Kelola Penjamin COB",
    title: "Kelola Penjamin COB",
    icon: Building2,
    admin: true,
  },
  { to: "/settings", label: "Pengaturan", title: "Pengaturan", icon: Settings, admin: true },
  {
    to: "/tampilan",
    label: "Pengaturan Tampilan",
    title: "Pengaturan Tampilan",
    icon: Palette,
    admin: true,
  },
  { to: "/akun", label: "Kelola Akun", title: "Kelola Akun", icon: UserRound, admin: true },
] as const;
export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useSuspenseQuery(meQuery);
  const { appearance: a } = useAppearance();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState("");
  if (!me) return null;
  const current = nav.find((n) => n.to === pathname);
  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }
  const sidebar = (mini: boolean) => (
    <div className="flex h-full flex-col bg-surface">
      <div
        className={cn(
          "flex min-h-28 items-center gap-3 border-b border-border-soft px-4",
          mini && "justify-center px-2",
        )}
      >
        {a.logo ? (
          <img src={a.logo} alt={`Logo ${a.name}`} className="h-10 w-10 shrink-0 object-contain" />
        ) : (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
            <Activity className="h-6 w-6" />
          </span>
        )}
        {!mini && (
          <div className="min-w-0">
            <p className="break-words text-xl font-extrabold uppercase leading-tight">{a.name}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{a.subtitle}</p>
          </div>
        )}
      </div>
      <nav aria-label="Menu utama" className="flex-1 space-y-1 overflow-y-auto py-5">
        {nav
          .filter((n) => !n.admin || me.role === "Admin")
          .map((n) => (
            <Button
              key={n.to}
              asChild
              variant="ghost"
              className={cn(
                "h-auto min-h-11 w-full justify-start rounded-none border-l-[3px] border-transparent px-5 py-3 text-muted-foreground hover:bg-primary-soft hover:text-primary",
                pathname === n.to && "border-primary bg-primary-soft font-bold text-primary",
                mini && "justify-center px-2",
              )}
              title={mini ? n.label : undefined}
            >
              <Link
                to={n.to}
                onClick={() => setMobile(false)}
                aria-current={pathname === n.to ? "page" : undefined}
              >
                <n.icon className="h-[18px] w-[18px] shrink-0" />
                {!mini && <span className="whitespace-normal text-left text-sm">{n.label}</span>}
              </Link>
            </Button>
          ))}
      </nav>
      <div className="border-t border-border-soft p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg bg-muted p-3",
            mini && "justify-center p-1",
          )}
        >
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary"
            aria-label={`Profil ${me.nama || me.user}`}
          >
            {(me.nama || me.user).slice(0, 1).toUpperCase()}
          </span>
          {!mini && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{me.nama || me.user}</p>
              <p className="text-xs text-muted-foreground">{me.role}</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          className="mt-2 w-full text-muted-foreground"
          onClick={logout}
          title="Logout"
        >
          <LogOut />
          {!mini && "Logout"}
        </Button>
      </div>
    </div>
  );
  return (
    <div className={cn("app-shell min-h-screen bg-background", collapsed && "app-shell-collapsed")}>
      <aside className="app-sidebar no-print hidden md:block">
        {sidebar(collapsed)}
        <Button
          className="absolute bottom-24 right-1"
          variant="ghost"
          size="icon"
          title={collapsed ? "Buka sidebar" : "Ciutkan sidebar"}
          aria-label={collapsed ? "Buka sidebar" : "Ciutkan sidebar"}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
        </Button>
      </aside>
      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side="left" className="w-[260px] max-w-[85vw] bg-surface p-0">
          <SheetTitle className="sr-only">Menu Casemix</SheetTitle>
          {sidebar(false)}
        </SheetContent>
      </Sheet>
      <div className="app-content min-w-0">
        <header className="app-topbar no-print sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-border-soft bg-surface px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Buka atau tutup sidebar"
            onClick={() => {
              if (window.innerWidth < 768) setMobile(!mobile);
              else setCollapsed(!collapsed);
            }}
          >
            <Menu />
          </Button>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold md:text-base">
            {current?.title ?? "Casemix RS"}
          </p>
          <form
            className="relative hidden w-56 lg:block"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/pasien", search: { q: search } });
            }}
          >
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Cari pasien di semua data"
              placeholder="Cari pasien…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary"
            title={me.nama || me.user}
          >
            {(me.nama || me.user).slice(0, 1).toUpperCase()}
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Notifikasi">
                <Bell />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end">
              <p className="text-sm font-semibold">Notifikasi</p>
              <p className="mt-2 text-sm text-muted-foreground">Tidak ada notifikasi baru.</p>
            </PopoverContent>
          </Popover>
        </header>
        {children}
      </div>
    </div>
  );
}
