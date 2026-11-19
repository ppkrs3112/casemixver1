import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
export const DEFAULT_APPEARANCE = {
  name: "Casemix RS",
  subtitle: "V4.3 - November 2026",
  version: "V4.3",
  logo: "",
  logoPath: "",
  primary: "#C0267A",
  secondary: "#F97316",
  background: "#F8F7FA",
  gradientLeft: "#C0267A",
  gradientRight: "#F97316",
  direction: "Diagonal",
  loginTitle: "Casemix RS V4",
  loginSubtitle: "Selamat datang kembali!",
  note: "Info: Gunakan akun sesuai peran yang diberikan Admin.",
  showNote: true,
  showAccounts: false,
  footer: "© 2026 Casemix RS - Sistem Informasi Casemix",
};
export type Appearance = typeof DEFAULT_APPEARANCE;
export const LOGO_LIMIT = 2 * 1024 * 1024;
export function validateLogo(file: Pick<File, "size" | "type">) {
  return !["image/png", "image/jpeg"].includes(file.type)
    ? "Logo harus PNG atau JPG"
    : file.size > LOGO_LIMIT
      ? "Ukuran logo maksimal 2MB"
      : null;
}
export function normalizeAppearance(raw: unknown): Appearance {
  const p = { ...DEFAULT_APPEARANCE };
  if (!raw || typeof raw !== "object") return p;
  for (const k of Object.keys(p) as (keyof Appearance)[]) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v === typeof p[k]) (p as unknown as Record<string, unknown>)[k] = v;
  }
  for (const k of ["primary", "secondary", "background", "gradientLeft", "gradientRight"] as const)
    if (!/^#[0-9a-f]{6}$/i.test(p[k])) p[k] = DEFAULT_APPEARANCE[k];
  if (p.logo && !/^data:image\/(png|jpeg);base64,/.test(p.logo)) p.logo = "";
  return p;
}
const Context = createContext<{
  appearance: Appearance;
  savedAppearance: Appearance;
  preview: (p: Appearance | null) => void;
  save: (p: Appearance) => Promise<void>;
}>({ appearance: DEFAULT_APPEARANCE, savedAppearance: DEFAULT_APPEARANCE, preview: () => {}, save: async () => {} });
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Appearance | null>(null);
  const { data } = useQuery({
    queryKey: ["appearance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appearance_settings")
        .select("settings")
        .eq("id", "global")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return normalizeAppearance(data?.settings);
    },
    refetchInterval: 15000,
  });
  const appearance = draft ?? data ?? DEFAULT_APPEARANCE;
  useEffect(() => {
    const root = document.documentElement;
    const p = appearance;
    root.style.setProperty("--primary", p.primary);
    root.style.setProperty("--ring", p.primary);
    root.style.setProperty("--chart-1", p.primary);
    root.style.setProperty("--sidebar-primary", p.primary);
    root.style.setProperty("--secondary", p.secondary);
    root.style.setProperty("--chart-2", p.secondary);
    root.style.setProperty("--background", p.background);
    root.style.setProperty(
      "--gradient-hero",
      `linear-gradient(${p.direction === "Kiri ke Kanan" ? "90deg" : p.direction === "Atas ke Bawah" ? "180deg" : "135deg"}, ${p.gradientLeft}, ${p.gradientRight})`,
    );
    root.style.setProperty(
      "--primary-soft",
      `color-mix(in srgb, ${p.primary} 10%, var(--surface))`,
    );
    root.style.setProperty(
      "--sidebar-accent",
      `color-mix(in srgb, ${p.primary} 10%, var(--surface))`,
    );
  }, [appearance]);
  async function save(p: Appearance) {
    const { error } = await supabase
      .from("appearance_settings")
      .upsert({
        id: "global",
        settings: p as unknown as Json,
        updated_at: new Date().toISOString(),
      });
    if (error) throw new Error(error.message);
    qc.setQueryData(["appearance"], p);
    setDraft(null);
    await qc.invalidateQueries({ queryKey: ["appearance"] });
  }
  return (
    <Context.Provider value={{ appearance, savedAppearance: data ?? DEFAULT_APPEARANCE, preview: setDraft, save }}>{children}</Context.Provider>
  );
}
export const useAppearance = () => useContext(Context);
