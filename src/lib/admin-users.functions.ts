import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = [
  "super_admin", "admin", "executive", "finance", "credit", "operations", "sales", "projects",
] as const;

type Ctx = { supabase: any; userId: string };

/** Confirms the caller administers a company and returns that company's id. */
async function assertCompanyAdminTenant(ctx: Ctx): Promise<string> {
  const { data } = await ctx.supabase
    .from("user_roles").select("role,tenant_id").eq("user_id", ctx.userId)
    .in("role", ["super_admin", "admin"]).limit(1).maybeSingle();
  if (!data?.tenant_id) throw new Error("Forbidden: company admins only");
  return data.tenant_id as string;
}

async function assertSameTenant(ctx: Ctx, tenantId: string, targetUserId: string) {
  const { data } = await ctx.supabase.from("profiles")
    .select("tenant_id").eq("id", targetUserId).maybeSingle();
  if (!data || data.tenant_id !== tenantId) throw new Error("Forbidden: cross-company action");
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
    const tenantId = await assertCompanyAdminTenant(context);
    const { signUpAppUser } = await import("./provision.server");

    const uid = await signUpAppUser({
      email: data.email,
      password: data.password,
      metadata: { full_name: data.full_name, tenant_id: tenantId },
    });

    await context.supabase.from("profiles").update({
      email: data.email,
      full_name: data.full_name,
      phone: data.phone ?? null,
      status: "active",
    }).eq("id", uid);

    await context.supabase.from("user_roles").delete().eq("user_id", uid);
    const { error: re } = await context.supabase.from("user_roles").insert(
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
    const tenantId = await assertCompanyAdminTenant(context);
    await assertSameTenant(context, tenantId, data.user_id);
    await context.supabase.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await context.supabase.from("user_roles")
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
    const tenantId = await assertCompanyAdminTenant(context);
    await assertSameTenant(context, tenantId, data.user_id);
    const { error } = await context.supabase.from("profiles")
      .update({ status: data.status }).eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await assertCompanyAdminTenant(context);
    await assertSameTenant(context, tenantId, data.user_id);
    if (data.user_id === context.userId) throw new Error("Cannot delete your own account");

    // Revoke all access first (works without privileged keys).
    await context.supabase.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await context.supabase.from("profiles").delete().eq("id", data.user_id);
    if (error) throw new Error(error.message);

    // Remove the login itself when a privileged key is available.
    const { optionalAdminClient } = await import("./provision.server");
    const admin = await optionalAdminClient();
    if (admin) await admin.auth.admin.deleteUser(data.user_id);
    return { ok: true };
  });

export const setUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    user_id: z.string().uuid(),
    new_password: z.string().min(8).max(72),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await assertCompanyAdminTenant(context);
    await assertSameTenant(context, tenantId, data.user_id);
    const { data: prof } = await context.supabase.from("profiles")
      .select("email").eq("id", data.user_id).maybeSingle();
    if (!prof?.email) throw new Error("User not found");

    const { optionalAdminClient, sendPasswordResetEmail } = await import("./provision.server");
    const admin = await optionalAdminClient();
    if (admin) {
      const { error } = await admin.auth.admin.updateUserById(data.user_id, {
        password: data.new_password, email_confirm: true, ban_duration: "none",
      } as any);
      if (error) throw new Error(error.message);
      await context.supabase.from("profiles").update({ status: "active" }).eq("id", data.user_id);
      return { ok: true, email: prof.email, emailed: false };
    }

    await sendPasswordResetEmail(prof.email);
    await context.supabase.from("profiles").update({ status: "active" }).eq("id", data.user_id);
    return { ok: true, email: prof.email, emailed: true };
  });
