import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
export type Payer = Database["public"]["Tables"]["cob_payers"]["Row"];
export const payersQuery = queryOptions({
  queryKey: ["payers"],
  queryFn: async () => {
    const { data, error } = await supabase.from("cob_payers").select("*").order("nama");
    if (error) throw new Error(error.message);
    return data;
  },
});
export async function savePayer(p: {
  id?: string | undefined;
  nama: string;
  jenis: string;
  kontak: string;
  aktif: boolean;
}) {
  if (!p.nama.trim()) throw new Error("Nama penjamin wajib diisi");
  const { id, ...row } = p;
  const res = id
    ? await supabase.from("cob_payers").update(row).eq("id", id).select().single()
    : await supabase.from("cob_payers").insert(row).select().single();
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
export async function deletePayer(id: string) {
  const { error } = await supabase.from("cob_payers").delete().eq("id", id);
  if (error)
    throw new Error(
      error.code === "23503"
        ? "Penjamin sudah dipakai pasien. Ubah menjadi Nonaktif agar riwayat tetap utuh."
        : error.message,
    );
}
