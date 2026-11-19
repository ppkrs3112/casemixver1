// Browser-side data access for patients and the signed-in account (RLS applies).
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Akses, Patient, Role, UserAccount } from "@/lib/casemix";

type Row = Database["public"]["Tables"]["patients"]["Row"];
type Insert = Database["public"]["Tables"]["patients"]["Insert"];

const n = (v: unknown) => Number(v) || 0;

export function fromRow(r: Row): Patient {
  return {
    id: r.id,
    tanggal: r.tanggal,
    nama: r.nama,
    rm: r.rm,
    dpjp: r.dpjp,
    inacbgs: n(r.inacbgs),
    billing: n(r.billing),
    jasaDpjp: n(r.jasa_dpjp),
    jasaDu: n(r.jasa_du),
    jasaPenunjang: n(r.jasa_penunjang),
    konsul: n(r.konsul),
    farmasi: n(r.farmasi),
    lab: n(r.lab),
    radiologi: n(r.radiologi),
    darah: n(r.darah),
    pa: n(r.pa),
    opsLain: n(r.ops_lain),
  };
}

export function toRow(p: Patient): Insert {
  return {
    tanggal: p.tanggal,
    nama: p.nama.trim(),
    rm: p.rm.trim(),
    dpjp: p.dpjp.trim(),
    inacbgs: p.inacbgs,
    billing: p.billing,
    jasa_dpjp: p.jasaDpjp,
    jasa_du: p.jasaDu,
    jasa_penunjang: p.jasaPenunjang,
    konsul: p.konsul,
    farmasi: p.farmasi,
    lab: p.lab,
    radiologi: p.radiologi,
    darah: p.darah,
    pa: p.pa,
    ops_lain: p.opsLain,
  };
}

async function fetchAllPatients(): Promise<Patient[]> {
  const page = 1000;
  const out: Patient[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .order("tanggal", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, from + page - 1);
    if (error) throw new Error(error.message);
    out.push(...data.map(fromRow));
    if (data.length < page) break;
  }
  return out;
}

export const patientsQuery = queryOptions({
  queryKey: ["patients"],
  queryFn: fetchAllPatients,
});

export async function savePatient(p: Patient) {
  const row = toRow(p);
  const res = p.id
    ? await supabase.from("patients").update(row).eq("id", p.id)
    : await supabase.from("patients").insert(row);
  if (res.error) throw new Error(res.error.message);
}

export async function insertPatients(list: Patient[]) {
  for (let i = 0; i < list.length; i += 500) {
    const { error } = await supabase.from("patients").insert(list.slice(i, i + 500).map(toRow));
    if (error) throw new Error(error.message);
  }
}

export async function deletePatient(id: string) {
  const { error } = await supabase.from("patients").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteAllPatients() {
  const { error } = await supabase.from("patients").delete().gte("tanggal", "1900-01-01");
  if (error) throw new Error(error.message);
}

const ROLE_MAP: Record<string, Role> = { admin: "Admin", inputer: "Inputer", viewer: "Viewer" };

export interface Account extends UserAccount {
  id: string;
}

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<Account | null> => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return null;
    const [p, r, a] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
      supabase.from("user_permissions").select("*").eq("user_id", uid).maybeSingle(),
    ]);
    return {
      id: uid,
      user: p.data?.username ?? "",
      nama: p.data?.nama ?? "",
      pass: "",
      role: ROLE_MAP[r.data?.role ?? "viewer"] ?? "Viewer",
      akses: toAkses(a.data),
    };
  },
});

function toAkses(a: Database["public"]["Tables"]["user_permissions"]["Row"] | null): Akses {
  return {
    sdm: !!a?.can_sdm,
    ops: !!a?.can_ops,
    billing: !!a?.can_billing,
    hapus: !!a?.can_hapus,
    export: !!a?.can_export,
  };
}

export const accountsQuery = queryOptions({
  queryKey: ["accounts"],
  queryFn: async (): Promise<Account[]> => {
    const [p, r, a] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("user_permissions").select("*"),
    ]);
    if (p.error) throw new Error(p.error.message);
    return (p.data ?? []).map((pr) => ({
      id: pr.id,
      user: pr.username,
      nama: pr.nama,
      pass: "",
      role: ROLE_MAP[r.data?.find((x) => x.user_id === pr.id)?.role ?? "viewer"] ?? "Viewer",
      akses: toAkses(a.data?.find((x) => x.user_id === pr.id) ?? null),
    }));
  },
});
