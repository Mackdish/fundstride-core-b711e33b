import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = [
  "super_admin", "admin", "executive", "finance", "credit", "operations",
] as const;

// Lazy server-only import keeps the service-role client out of any
// client-reachable module graph. See tanstack-supabase-import-graph.
async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertSuperAdminAndGetTenant(userId: string): Promise<string> {
  const admin = await getAdmin();
  const { data: role } = await admin
    .from("user_roles").select("role,tenant_id").eq("user_id", userId)
    .eq("role", "super_admin").maybeSingle();
  if (!role) throw new Error("Forbidden: super_admin only");
  return role.tenant_id as string;
}

async function assertSameTenant(callerTenant: string, targetUserId: string) {
  const admin = await getAdmin();
  const { data } = await admin.from("profiles")
    .select("tenant_id").eq("id", targetUserId).maybeSingle();
  if (!data || data.tenant_id !== callerTenant) throw new Error("Forbidden: cross-tenant action");
  const { data: targetRoles } = await admin.from("user_roles").select("role").eq("user_id", targetUserId);
  if ((targetRoles ?? []).some((r: any) => r.role === "platform_admin")) {
    throw new Error("Forbidden: platform administrator");
  }
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
    const admin = await getAdmin();

    if (data.roles.includes("platform_admin")) throw new Error("Forbidden: platform administrator role cannot be assigned here");

    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, tenant_id: tenantId },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");
    const uid = created.user.id;

    await admin.from("profiles").upsert({
      id: uid, email: data.email, full_name: data.full_name,
      phone: data.phone ?? null, tenant_id: tenantId,
    });

    await admin.from("user_roles").delete().eq("user_id", uid);
    const { error: re } = await admin.from("user_roles").insert(
      data.roles.map((role) => ({ user_id: uid, role, tenant_id: tenantId })),
    );
    if (re) throw new Error(re.message);

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
    if (data.user_id === context.userId) throw new Error("Cannot change your own roles");
    await assertSameTenant(tenantId, data.user_id);
    if (data.roles.includes("platform_admin")) throw new Error("Forbidden: platform administrator role cannot be assigned here");
    const admin = await getAdmin();
    await admin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await admin.from("user_roles")
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
    const admin = await getAdmin();
    if (data.user_id === context.userId) throw new Error("Cannot change your own status");
    const { error } = await admin.from("profiles")
      .update({ status: data.status }).eq("id", data.user_id);
    if (error) throw new Error(error.message);
    const ban_duration = data.status === "active" ? "none" : "876000h";
    const { error: authError } = await admin.auth.admin.updateUserById(data.user_id, { ban_duration });
    if (authError) throw new Error("Failed to update authentication status");
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await assertSuperAdminAndGetTenant(context.userId);
    await assertSameTenant(tenantId, data.user_id);
    if (data.user_id === context.userId) throw new Error("Cannot delete your own account");
    const admin = await getAdmin();
    const { error } = await admin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    await admin.from("profiles").delete().eq("id", data.user_id);
    await admin.from("user_roles").delete().eq("user_id", data.user_id);
    return { ok: true };
  });

export const setUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    user_id: z.string().uuid(),
    new_password: z.string().min(8).max(72),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await assertSuperAdminAndGetTenant(context.userId);
    await assertSameTenant(tenantId, data.user_id);
    const admin = await getAdmin();
    const { data: prof } = await admin.from("profiles").select("email,status").eq("id", data.user_id).maybeSingle();
    if (!prof?.email) throw new Error("User not found");
    // Resetting a password must never silently reactivate a suspended account.
    const ban_duration = prof.status === "active" ? "none" : "876000h";
    const { error } = await admin.auth.admin.updateUserById(data.user_id, {
      password: data.new_password,
      email_confirm: true,
      ban_duration,
    });
    if (error) throw new Error(error.message);
    await admin.from("profiles").update({ status: prof.status }).eq("id", data.user_id);
    return { ok: true, email: prof.email };
  });
