import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

async function assertNoCustomerRole(ctx: Ctx, userId: string) {
  const { data: roles } = await ctx.supabase
    .from("user_roles").select("role").eq("user_id", userId);
  if ((roles ?? []).some((r: any) => r.role === "customer")) {
    throw new Error("Forbidden: user already has a customer role");
  }
}

const StaffRole = z.enum(["admin", "operations"]); // Admin | Staff User

const StaffProfileFields = z.object({
  first_name: z.string().min(1).max(60),
  last_name: z.string().min(1).max(60),
  email: z.string().email(),
  phone: z.string().max(40).optional().nullable(),
  id_number: z.string().max(60).optional().nullable(),
  gender: z.enum(["male", "female", "other"]).optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  job_title: z.string().min(1).max(120),
  department: z.enum(["finance", "projects", "sales_bd", "it", "legal_compliance", "operations"]),
  employment_type: z.enum(["full_time", "part_time", "contract"]),
  start_date: z.string().optional().nullable(),
  role: StaffRole,
  emergency_contact_name: z.string().max(120).optional().nullable(),
  emergency_contact_phone: z.string().max(40).optional().nullable(),
  emergency_contact_relationship: z.string().max(60).optional().nullable(),
});

export const createStaffMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => StaffProfileFields.extend({
    password: z.string().min(8).max(72),
    force_password_change: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await assertCompanyAdminTenant(context);
    const full_name = `${data.first_name} ${data.last_name}`.trim();

    const { signUpAppUser } = await import("./provision.server");
    const uid = await signUpAppUser({
      email: data.email,
      password: data.password,
      metadata: { full_name, tenant_id: tenantId },
    });

    const { error: pe } = await context.supabase.from("profiles").update({
      email: data.email,
      full_name,
      phone: data.phone ?? null,
      job_title: data.job_title,
      department: data.department,
      employment_type: data.employment_type,
      start_date: data.start_date || null,
      id_number: data.id_number ?? null,
      gender: data.gender ?? null,
      date_of_birth: data.date_of_birth || null,
      emergency_contact_name: data.emergency_contact_name ?? null,
      emergency_contact_phone: data.emergency_contact_phone ?? null,
      emergency_contact_relationship: data.emergency_contact_relationship ?? null,
      force_password_change: data.force_password_change,
      status: "active",
    }).eq("id", uid);
    if (pe) throw new Error(pe.message);

    await context.supabase.from("user_roles").delete().eq("user_id", uid);
    const { error: re } = await context.supabase.from("user_roles")
      .insert([{ user_id: uid, role: data.role, tenant_id: tenantId }]);
    if (re) throw new Error(re.message);

    return { id: uid };
  });

export const updateStaffMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => StaffProfileFields.extend({
    user_id: z.string().uuid(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await assertCompanyAdminTenant(context);
    await assertSameTenant(context, tenantId, data.user_id);
    await assertNoCustomerRole(context, data.user_id);
    const full_name = `${data.first_name} ${data.last_name}`.trim();

    const { error: pe } = await context.supabase.from("profiles").update({
      email: data.email,
      full_name,
      phone: data.phone ?? null,
      job_title: data.job_title,
      department: data.department,
      employment_type: data.employment_type,
      start_date: data.start_date || null,
      id_number: data.id_number ?? null,
      gender: data.gender ?? null,
      date_of_birth: data.date_of_birth || null,
      emergency_contact_name: data.emergency_contact_name ?? null,
      emergency_contact_phone: data.emergency_contact_phone ?? null,
      emergency_contact_relationship: data.emergency_contact_relationship ?? null,
    }).eq("id", data.user_id);
    if (pe) throw new Error(pe.message);

    await context.supabase.from("user_roles").delete().eq("user_id", data.user_id);
    const { error: re } = await context.supabase.from("user_roles")
      .insert([{ user_id: data.user_id, role: data.role, tenant_id: tenantId }]);
    if (re) throw new Error(re.message);

    return { ok: true };
  });

export const setStaffStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    user_id: z.string().uuid(),
    status: z.enum(["active", "inactive", "suspended"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await assertCompanyAdminTenant(context);
    await assertSameTenant(context, tenantId, data.user_id);
    if (data.user_id === context.userId) throw new Error("Cannot change your own status");

    const { error } = await context.supabase.from("profiles")
      .update({ status: data.status }).eq("id", data.user_id);
    if (error) throw new Error(error.message);

    // Also block sign-in at the auth layer when a privileged key is available.
    const { optionalAdminClient } = await import("./provision.server");
    const admin = await optionalAdminClient();
    if (admin) {
      const ban_duration = data.status === "active" ? "none" : "876000h";
      await admin.auth.admin.updateUserById(data.user_id, { ban_duration } as any);
    }
    return { ok: true };
  });

export const deleteStaffMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await assertCompanyAdminTenant(context);
    await assertSameTenant(context, tenantId, data.user_id);
    if (data.user_id === context.userId) throw new Error("Cannot delete your own account");

    await context.supabase.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await context.supabase.from("profiles").delete().eq("id", data.user_id);
    if (error) throw new Error(error.message);

    const { optionalAdminClient } = await import("./provision.server");
    const admin = await optionalAdminClient();
    if (admin) await admin.auth.admin.deleteUser(data.user_id);
    return { ok: true };
  });

export const resetStaffPassword = createServerFn({ method: "POST" })
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
      await context.supabase.from("profiles")
        .update({ force_password_change: true, status: "active" }).eq("id", data.user_id);
      return { ok: true, email: prof.email, emailed: false };
    }

    await sendPasswordResetEmail(prof.email);
    await context.supabase.from("profiles")
      .update({ force_password_change: true, status: "active" }).eq("id", data.user_id);
    return { ok: true, email: prof.email, emailed: true };
  });
