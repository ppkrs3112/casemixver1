import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_USERS, USERNAME_RE, normalizeUsername, usernameToEmail } from "@/lib/casemix";

const roleSchema = z.enum(["Admin", "Inputer", "Viewer"]);
const aksesSchema = z.object({
  sdm: z.boolean(),
  ops: z.boolean(),
  billing: z.boolean(),
  hapus: z.boolean(),
  export: z.boolean(),
});
const toDbRole = (r: z.infer<typeof roleSchema>) => r.toLowerCase() as "admin" | "inputer" | "viewer";
const permRow = (userId: string, a: z.infer<typeof aksesSchema>) => ({
  user_id: userId,
  can_sdm: a.sdm,
  can_ops: a.ops,
  can_billing: a.billing,
  can_hapus: a.hapus,
  can_export: a.export,
});

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function createOne(
  admin: Admin,
  input: { username: string; password: string; nama: string; role: z.infer<typeof roleSchema>; akses: z.infer<typeof aksesSchema> },
) {
  const username = normalizeUsername(input.username);
  const { data, error } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password: input.password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error || !data.user) {
    if (error?.message?.toLowerCase().includes("already")) throw new Error(`Username "${username}" sudah dipakai.`);
    throw new Error(error?.message ?? "Gagal membuat akun.");
  }
  const id = data.user.id;
  const steps = [
    await admin.from("profiles").insert({ id, username, nama: input.nama || username }),
    await admin.from("user_roles").insert({ user_id: id, role: toDbRole(input.role) }),
    await admin.from("user_permissions").insert(permRow(id, input.akses)),
  ];
  const failed = steps.find((s) => s.error);
  if (failed?.error) {
    await admin.auth.admin.deleteUser(id);
    throw new Error(failed.error.message);
  }
  return id;
}

/** Creates the three starting accounts the first time the app is opened. No-op once any account exists. */
export const ensureDefaultAccounts = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin.from("profiles").select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  if ((count ?? 0) > 0) return { created: 0 };
  let created = 0;
  for (const u of DEFAULT_USERS) {
    try {
      await createOne(supabaseAdmin, { username: u.user, password: u.pass, nama: u.nama, role: u.role, akses: u.akses });
      created++;
    } catch (e) {
      console.error("ensureDefaultAccounts", u.user, e);
    }
  }
  return { created };
});

async function assertAdmin(supabase: SupabaseClient<Database>, userId: string) {
  // Role check runs as the caller (RLS applies), never through the admin client.
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Hanya Admin yang boleh mengelola akun.");
}

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        username: z.string().transform(normalizeUsername).refine((u) => USERNAME_RE.test(u), {
          message: "Username 3–32 karakter: huruf kecil, angka, titik, minus, atau garis bawah.",
        }),
        password: z.string().min(6, "Password minimal 6 karakter."),
        nama: z.string().max(80).default(""),
        role: roleSchema,
        akses: aksesSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = await createOne(supabaseAdmin, data);
    return { id };
  });

export const updateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        nama: z.string().max(80),
        role: roleSchema,
        akses: aksesSchema,
        password: z.string().min(6, "Password minimal 6 karakter.").optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.userId === context.userId && data.role !== "Admin") {
      throw new Error("Anda tidak bisa menurunkan role akun Anda sendiri.");
    }
    const r1 = await supabaseAdmin.from("profiles").update({ nama: data.nama }).eq("id", data.userId);
    if (r1.error) throw new Error(r1.error.message);
    const r2 = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: toDbRole(data.role) }, { onConflict: "user_id" });
    if (r2.error) throw new Error(r2.error.message);
    const r3 = await supabaseAdmin.from("user_permissions").upsert(permRow(data.userId, data.akses));
    if (r3.error) throw new Error(r3.error.message);
    if (data.password) {
      const r4 = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.password });
      if (r4.error) throw new Error(r4.error.message);
    }
    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("Anda tidak bisa menghapus akun Anda sendiri.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
