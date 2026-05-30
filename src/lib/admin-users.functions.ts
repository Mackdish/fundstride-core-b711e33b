import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ROLES = [
  "super_admin","credit_officer","operations_officer","site_monitoring_officer",
  "finance_officer","risk_compliance_officer","developer","contractor","executive",
] as const;

async function assertSuperAdminAndGetTenant(userId: string): Promise<string> {
  const { data: role } = await supabaseAdmin
    .from("user_roles").select("role,tenant_id").eq("user_id", userId)
    .eq("role", "super_admin").maybeSingle();
  if (!role) throw new Error("Forbidden: super_admin only");
  return role.tenant_id as string;
}

async function assertSameTenant(callerTenant: string, targetUserId: string) {
  const { data } = await supabaseAdmin.from("profiles")
    .select("tenant_id").eq("id", targetUserId).maybeSingle();
  if (!data || data.tenant_id !== callerTenant) throw new Error("Forbidden: cross-tenant action");
}

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    email: z.string().email(),
    password: z.string().min(8).max(72),
    full_name: z.string().min(1).max(120),
    phone: z.string().max(40).optional().nullable(),
    roles: z.array(z.enum(ROLES)).min(1).max(9),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await assertSuperAdminAndGetTenant(context.userId);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, tenant_id: tenantId },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");
    const uid = created.user.id;

    await supabaseAdmin.from("profiles").upsert({
      id: uid, email: data.email, full_name: data.full_name,
      phone: data.phone ?? null, tenant_id: tenantId,
    });

    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    await supabaseAdmin.from("user_roles").insert(
      data.roles.map((role) => ({ user_id: uid, role, tenant_id: tenantId })),
    );

    return { id: uid };
  });

export const updateUserRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    user_id: z.string().uuid(),
    roles: z.array(z.enum(ROLES)).min(1).max(9),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await assertSuperAdminAndGetTenant(context.userId);
    await assertSameTenant(tenantId, data.user_id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin.from("user_roles")
      .insert(data.roles.map((role) => ({ user_id: data.user_id, role, tenant_id: tenantId })));
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    user_id: z.string().uuid(),
    status: z.enum(["active", "suspended"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await assertSuperAdminAndGetTenant(context.userId);
    await assertSameTenant(tenantId, data.user_id);
    const { error } = await supabaseAdmin.from("profiles")
      .update({ status: data.status }).eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await assertSuperAdminAndGetTenant(context.userId);
    await assertSameTenant(tenantId, data.user_id);
    if (data.user_id === context.userId) throw new Error("Cannot delete your own account");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
