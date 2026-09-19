import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertStaffManagerAndGetTenant(userId: string): Promise<{ tenantId: string; role: "super_admin" | "admin" }> {
  const admin = await getAdmin();
  const { data: roles } = await admin.from("user_roles")
    .select("role,tenant_id").eq("user_id", userId).in("role", ["super_admin", "admin"]);
  if (!roles?.length) throw new Error("Forbidden: company admins only");
  const role = roles.find((r) => r.role === "super_admin") ?? roles[0];
  return { tenantId: role.tenant_id as string, role: role.role as "super_admin" | "admin" };
}

async function assertTargetIsManageable(callerRole: "super_admin" | "admin", callerTenant: string, targetUserId: string) {
  const admin = await getAdmin();
  const { data } = await admin.from("profiles").select("tenant_id").eq("id", targetUserId).maybeSingle();
  if (!data || data.tenant_id !== callerTenant) throw new Error("Forbidden: cross-tenant action");

  const { data: targetRoles } = await admin.from("user_roles").select("role").eq("user_id", targetUserId);
  const roles = new Set((targetRoles ?? []).map((r: any) => r.role));
  if (roles.has("platform_admin") || roles.has("super_admin")) {
    throw new Error("Forbidden: higher-privileged account");
  }
  if (callerRole === "admin" && roles.has("admin")) {
    throw new Error("Forbidden: only a super admin can manage administrators");
  }
}


async function assertNoCustomerRole(userId: string) {
  const admin = await getAdmin();
  const { data: roles } = await admin
    .from("user_roles").select("role").eq("user_id", userId);
  const hasCustomer = (roles ?? []).some((r: any) => r.role === "customer");
  if (hasCustomer) throw new Error("Forbidden: user already has a customer role");
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
    const manager = await assertStaffManagerAndGetTenant(context.userId);
    const tenantId = manager.tenantId;
    const admin = await getAdmin();
    const full_name = `${data.first_name} ${data.last_name}`.trim();

    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name, tenant_id: tenantId },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");
    const uid = created.user.id;
    await assertNoCustomerRole(uid);
    if (manager.role === "admin" && data.role === "admin") {
      throw new Error("Forbidden: only a super admin can create administrators");
    }

    const profile = {
      id: uid,
      email: data.email,
      full_name,
      phone: data.phone ?? null,
      tenant_id: tenantId,
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
    };
    const { error: pe } = await admin.from("profiles").upsert(profile);
    if (pe) throw new Error(pe.message);

    await admin.from("user_roles").delete().eq("user_id", uid);
    const { error: re } = await admin.from("user_roles")
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
    const manager = await assertStaffManagerAndGetTenant(context.userId);
    const tenantId = manager.tenantId;
    await assertTargetIsManageable(manager.role, tenantId, data.user_id);
    const admin = await getAdmin();
    const full_name = `${data.first_name} ${data.last_name}`.trim();
    await assertNoCustomerRole(data.user_id);

    const { error: pe } = await admin.from("profiles").update({
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

    await admin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error: re } = await admin.from("user_roles")
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
    const manager = await assertStaffManagerAndGetTenant(context.userId);
    const tenantId = manager.tenantId;
    await assertTargetIsManageable(manager.role, tenantId, data.user_id);
    if (data.user_id === context.userId) throw new Error("Cannot change your own status");
    const admin = await getAdmin();
    const { error } = await admin.from("profiles")
      .update({ status: data.status }).eq("id", data.user_id);
    if (error) throw new Error(error.message);
    // Block sign-in for non-active users by banning at the auth layer.
    const ban_duration = data.status === "active" ? "none" : "876000h";
    await admin.auth.admin.updateUserById(data.user_id, { ban_duration } as any);
    return { ok: true };
  });

export const deleteStaffMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const manager = await assertStaffManagerAndGetTenant(context.userId);
    const tenantId = manager.tenantId;
    await assertTargetIsManageable(manager.role, tenantId, data.user_id);
    if (data.user_id === context.userId) throw new Error("Cannot delete your own account");
    const admin = await getAdmin();
    await admin.from("user_roles").delete().eq("user_id", data.user_id);
    await admin.from("profiles").delete().eq("id", data.user_id);
    const { error } = await admin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    user_id: z.string().uuid(),
    new_password: z.string().min(8).max(72),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const manager = await assertStaffManagerAndGetTenant(context.userId);
    const tenantId = manager.tenantId;
    await assertTargetIsManageable(manager.role, tenantId, data.user_id);
    const admin = await getAdmin();
    const { data: prof } = await admin.from("profiles").select("email,status").eq("id", data.user_id).maybeSingle();
    if (!prof?.email) throw new Error("User not found");
    // Resetting a password must never silently reactivate a suspended/inactive account.
    const ban_duration = prof.status === "active" ? "none" : "876000h";
    const { error } = await admin.auth.admin.updateUserById(data.user_id, {
      password: data.new_password,
      email_confirm: true,
      ban_duration,
    });
    if (error) throw new Error(error.message);
    await admin.from("profiles").update({ force_password_change: true }).eq("id", data.user_id);
    return { ok: true, email: prof.email };
  });
