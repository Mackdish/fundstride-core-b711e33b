import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Lazy server-only import keeps the service-role client out of any
// client-reachable module graph. See tanstack-supabase-import-graph.
async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertPlatformAdmin(userId: string) {
  const supabaseAdmin = await getAdmin();
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).in("role", ["platform_admin", "super_admin"]);
  if (!data || data.length === 0) throw new Error("Forbidden: platform/super admin only");
}

export const listCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context.userId);
    const supabaseAdmin = await getAdmin();
    const { data: tenants, error } = await supabaseAdmin
      .from("tenants").select("id,name,currency,status,created_at").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (tenants ?? []).map((t) => t.id);
    const { data: profiles } = await supabaseAdmin
      .from("profiles").select("id,email,full_name,tenant_id").in("tenant_id", ids);
    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("user_id,role,tenant_id").in("tenant_id", ids).eq("role", "super_admin");
    const adminIds = new Set((roles ?? []).map((r) => r.user_id));

    return (tenants ?? []).map((t) => {
      const users = (profiles ?? []).filter((p) => p.tenant_id === t.id);
      const admins = users.filter((u) => adminIds.has(u.id));
      return { ...t, user_count: users.length, admins };
    });
  });

export const createCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    company_name: z.string().min(2).max(120),
    admin_email: z.string().email(),
    admin_full_name: z.string().min(1).max(120),
    mode: z.enum(["invite", "password"]),
    password: z.string().min(8).max(72).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.userId);
    if (data.mode === "password" && (!data.password || data.password.length < 8)) {
      throw new Error("Password is required (min 8 characters) when setting credentials manually");
    }
    const supabaseAdmin = await getAdmin();

    // 1. Create tenant
    const { data: tenant, error: te } = await supabaseAdmin
      .from("tenants").insert({ name: data.company_name, created_by: context.userId })
      .select("id").single();
    if (te || !tenant) throw new Error(te?.message ?? "Failed to create company");

    await supabaseAdmin.from("tenant_settings").insert({ tenant_id: tenant.id });

    // 2. Create or invite admin user
    let uid: string;
    if (data.mode === "invite") {
      const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        data.admin_email,
        { data: { full_name: data.admin_full_name, tenant_id: tenant.id } },
      );
      if (error || !invited.user) {
        await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
        throw new Error(error?.message ?? "Failed to invite admin");
      }
      uid = invited.user.id;
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.admin_email,
        password: data.password!,
        email_confirm: true,
        user_metadata: { full_name: data.admin_full_name, tenant_id: tenant.id },
      });
      if (error || !created.user) {
        await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
        throw new Error(error?.message ?? "Failed to create admin");
      }
      uid = created.user.id;
    }

    // 3. Upsert profile + super_admin role (handle_new_user may have run with no tenant)
    await supabaseAdmin.from("profiles").upsert({
      id: uid, email: data.admin_email, full_name: data.admin_full_name, tenant_id: tenant.id,
    });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "super_admin", tenant_id: tenant.id });

    return { tenant_id: tenant.id, user_id: uid, mode: data.mode };
  });

export const deleteCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tenant_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.userId);
    const supabaseAdmin = await getAdmin();
    const { error } = await supabaseAdmin.from("tenants").delete().eq("id", data.tenant_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

