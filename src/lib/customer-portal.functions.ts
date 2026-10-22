import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const STAFF_ROLES = new Set([
  "super_admin", "admin", "executive", "finance", "credit", "operations",
  "sales", "projects", "credit_officer", "operations_officer",
  "site_monitoring_officer", "finance_officer", "risk_compliance_officer",
]);

async function assertStaffAndGetTenant(userId: string) {
  const admin = await getAdmin();
  const { data: profile, error: profileError } = await admin
    .from("profiles").select("tenant_id,status").eq("id", userId).maybeSingle();
  if (profileError || !profile?.tenant_id || profile.status !== "active") {
    throw new Error("Forbidden: active staff account and tenant required");
  }

  const { data: roles, error: roleError } = await admin
    .from("user_roles").select("role").eq("user_id", userId).eq("tenant_id", profile.tenant_id);
  if (roleError) throw new Error("Unable to verify staff permissions");
  if (!(roles ?? []).some((row: { role: string }) => STAFF_ROLES.has(row.role))) {
    throw new Error("Forbidden: staff only");
  }
  return { admin, tenantId: profile.tenant_id as string };
}

async function findAuthUserByEmail(admin: any, email: string) {
  // Supabase Admin API does not expose a direct email lookup. Walk pages rather
  // than silently treating an account beyond the first page as a new identity.
  const perPage = 1000;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error("Unable to verify whether this email already has an account");
    const users = data?.users ?? [];
    const match = users.find((user: any) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (users.length < perPage) return null;
  }
  throw new Error("Too many accounts to safely verify this email. Please contact your platform administrator.");
}

/**
 * Admin/staff-managed customer invitation. New customers receive a Supabase
 * Auth invitation email; existing same-tenant customer identities can be linked
 * without resetting their password. Passwords and invitation tokens are never
 * stored by the application.
 */
export const inviteCustomerPortalAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    customer_id: z.string().uuid(),
    email: z.string().trim().email().max(254),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { admin, tenantId } = await assertStaffAndGetTenant(context.userId);
    const email = data.email.toLowerCase();
    const { data: customer, error: customerError } = await admin
      .from("customers")
      .select("id,tenant_id,name,email,owner_user_id")
      .eq("id", data.customer_id)
      .maybeSingle();

    if (customerError) throw new Error("Unable to load customer record");
    if (!customer || customer.tenant_id !== tenantId) throw new Error("Customer not found in your company");
    if (customer.owner_user_id) {
      const { data: linked, error: linkedError } = await admin
        .from("profiles").select("id,email").eq("id", customer.owner_user_id).maybeSingle();
      if (linkedError) throw new Error("Unable to verify the linked customer account");
      if (linked?.email?.toLowerCase() === email) {
        return { ok: true, mode: "already_linked" as const, email };
      }
      throw new Error("This customer is already linked to another account. Resolve that link before inviting a different account.");
    }

    const existing = await findAuthUserByEmail(admin, email);
    let userId: string;
    let mode: "linked_existing" | "invited_new";

    if (existing) {
      userId = existing.id;
      const { data: profile, error: profileError } = await admin
        .from("profiles").select("tenant_id,status,email").eq("id", userId).maybeSingle();
      if (profileError) throw new Error("Unable to verify the existing account");
      if (!profile || profile.tenant_id !== tenantId || profile.status !== "active") {
        throw new Error("The existing account is not an active account in this company.");
      }

      const { data: roles, error: rolesError } = await admin
        .from("user_roles").select("role").eq("user_id", userId);
      if (rolesError) throw new Error("Unable to verify existing account permissions");
      const existingRoles = (roles ?? []).map((row: { role: string }) => row.role);
      if (existingRoles.some((role: string) => STAFF_ROLES.has(role))) {
        throw new Error("A staff account cannot be linked as a customer account.");
      }
      if (existingRoles.some((role: string) => !["customer", "developer"].includes(role))) {
        throw new Error("This account has another application role and cannot be linked as a customer.");
      }

      const { error: linkError } = await admin.from("customers")
        .update({ owner_user_id: userId, email: customer.email ?? email })
        .eq("id", customer.id);
      if (linkError) throw new Error("Unable to link the existing account to this customer");

      await admin.from("user_roles").delete().eq("user_id", userId).in("role", ["developer", "customer"]);
      const { error: roleInsertError } = await admin.from("user_roles")
        .insert({ user_id: userId, role: "customer", tenant_id: tenantId });
      if (roleInsertError) throw new Error("Account linked, but customer permissions could not be assigned. Please contact an administrator.");

      const { error: invitationError } = await (admin as any).from("customer_portal_invitations").insert({
        tenant_id: tenantId,
        customer_id: customer.id,
        email,
        invited_by: context.userId,
        invited_user_id: userId,
        status: "accepted",
        accepted_user_id: userId,
        accepted_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
      });
      if (invitationError) throw new Error("Account linked, but the access audit record could not be saved.");
      return { ok: true, mode: "linked_existing" as const, email };
    }

    const { data: invitation, error: invitationError } = await (admin as any)
      .from("customer_portal_invitations")
      .insert({
        tenant_id: tenantId,
        customer_id: customer.id,
        email,
        invited_by: context.userId,
      })
      .select("id")
      .single();
    if (invitationError) throw new Error("Unable to create the invitation record");

    const request = getRequest();
    if (!request?.url) throw new Error("Unable to determine the portal URL for the invitation");
    const redirectTo = new URL("/portal", request.url).toString();
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { full_name: customer.name, tenant_id: tenantId, customer_id: customer.id },
    });

    if (inviteError || !invited.user) {
      await (admin as any).from("customer_portal_invitations")
        .update({ status: "revoked" }).eq("id", invitation.id);
      throw new Error(inviteError?.message ?? "Supabase could not send the invitation. Check the Auth email and redirect URL settings.");
    }

    userId = invited.user.id;
    const { error: profileError } = await admin.from("profiles").upsert({
      id: userId,
      email,
      full_name: customer.name,
      tenant_id: tenantId,
      status: "active",
    });
    if (profileError) {
      await (admin as any).from("customer_portal_invitations")
        .update({ status: "revoked" }).eq("id", invitation.id);
      await admin.auth.admin.deleteUser(userId);
      throw new Error("The invitation could not be configured. Please retry after checking the profile schema.");
    }

    await admin.from("user_roles").delete().eq("user_id", userId).eq("role", "developer");
    const { error: roleError } = await admin.from("user_roles")
      .insert({ user_id: userId, role: "customer", tenant_id: tenantId });
    if (roleError) {
      await (admin as any).from("customer_portal_invitations")
        .update({ status: "revoked" }).eq("id", invitation.id);
      await admin.auth.admin.deleteUser(userId);
      throw new Error("The invitation was rolled back because customer permissions could not be assigned.");
    }

    const { error: linkError } = await admin.from("customers")
      .update({ owner_user_id: userId, email: customer.email ?? email })
      .eq("id", customer.id);
    if (linkError) {
      await (admin as any).from("customer_portal_invitations")
        .update({ status: "revoked" }).eq("id", invitation.id);
      await admin.auth.admin.deleteUser(userId);
      throw new Error("The invitation was rolled back because the customer record could not be linked.");
    }

    const { error: invitationUpdateError } = await (admin as any).from("customer_portal_invitations")
      .update({ invited_user_id: userId }).eq("id", invitation.id);
    if (invitationUpdateError) {
      throw new Error("The customer was invited, but the invitation record needs administrator review.");
    }

    return { ok: true, mode: "invited_new" as const, email };
  });

export const grantCustomerProjectAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    project_id: z.string().uuid(),
    user_id: z.string().uuid(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { admin, tenantId } = await assertStaffAndGetTenant(context.userId);
    const [{ data: project, error: projectError }, { data: profile, error: profileError }, { data: roles, error: rolesError }] =
      await Promise.all([
        admin.from("projects").select("id,tenant_id,customer_id").eq("id", data.project_id).maybeSingle(),
        admin.from("profiles").select("id,tenant_id,status").eq("id", data.user_id).maybeSingle(),
        admin.from("user_roles").select("role").eq("user_id", data.user_id),
      ]);
    if (projectError || !project || project.tenant_id !== tenantId) throw new Error("Project not found in your company");
    if (profileError || !profile || profile.tenant_id !== tenantId || profile.status !== "active") {
      throw new Error("Customer account must be active and belong to this company");
    }
    if (rolesError) throw new Error("Unable to verify customer role");
    const roleNames = (roles ?? []).map((row: { role: string }) => row.role);
    if (!roleNames.includes("customer") || roleNames.some((role: string) => STAFF_ROLES.has(role))) {
      throw new Error("Only a customer account can receive customer project access");
    }

    const { error } = await (admin as any).from("customer_project_access").upsert({
      project_id: project.id,
      user_id: data.user_id,
      tenant_id: tenantId,
      granted_by: context.userId,
      revoked_at: null,
    }, { onConflict: "project_id,user_id" });
    if (error) throw new Error("Unable to grant project access");
    return { ok: true };
  });

export const revokeCustomerProjectAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    project_id: z.string().uuid(),
    user_id: z.string().uuid(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { admin, tenantId } = await assertStaffAndGetTenant(context.userId);
    const { data: project, error: projectError } = await admin.from("projects")
      .select("id,tenant_id").eq("id", data.project_id).maybeSingle();
    if (projectError || !project || project.tenant_id !== tenantId) throw new Error("Project not found in your company");

    const { error } = await (admin as any).from("customer_project_access")
      .update({ revoked_at: new Date().toISOString() })
      .eq("project_id", data.project_id)
      .eq("user_id", data.user_id)
      .eq("tenant_id", tenantId)
      .is("revoked_at", null);
    if (error) throw new Error("Unable to revoke project access");
    return { ok: true };
  });


export const getProjectCustomerAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ project_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { admin, tenantId } = await assertStaffAndGetTenant(context.userId);
    const { data: project, error: projectError } = await admin
      .from("projects").select("id,tenant_id").eq("id", data.project_id).maybeSingle();
    if (projectError || !project || project.tenant_id !== tenantId) {
      throw new Error("Project not found in your company");
    }

    const { data: customerRoles, error: rolesError } = await admin
      .from("user_roles").select("user_id").eq("tenant_id", tenantId).eq("role", "customer");
    if (rolesError) throw new Error("Unable to load customer accounts");
    const candidateIds = [...new Set((customerRoles ?? []).map((row: any) => row.user_id))] as string[];

    const [profilesResult, accessResult] = await Promise.all([
      candidateIds.length
        ? admin.from("profiles").select("id,email,full_name,status").eq("tenant_id", tenantId).in("id", candidateIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      (admin as any).from("customer_project_access")
        .select("id,project_id,user_id,granted_by,created_at,revoked_at")
        .eq("project_id", data.project_id)
        .eq("tenant_id", tenantId)
        .is("revoked_at", null),
    ]);
    if (profilesResult.error) throw new Error("Unable to load customer profiles");
    if (accessResult.error) throw new Error("Unable to load project access assignments");

    const profiles = profilesResult.data ?? [];
    const profileById = new Map(profiles.map((profile: any) => [profile.id, profile]));
    const access = (accessResult.data ?? []).map((grant: any) => ({
      ...grant,
      profile: profileById.get(grant.user_id) ?? null,
    }));
    const assignedIds = new Set(access.map((grant: any) => grant.user_id));
    const candidates = profiles
      .filter((profile: any) => profile.status === "active")
      .map((profile: any) => ({ ...profile, alreadyAssigned: assignedIds.has(profile.id) }));

    return { candidates, access };
  });


export const acceptCustomerPortalInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({}).parse(input))
  .handler(async ({ context }) => {
    const admin = await getAdmin();
    const { data: profile, error: profileError } = await admin
      .from("profiles").select("tenant_id,status,email").eq("id", context.userId).maybeSingle();
    if (profileError || !profile?.tenant_id || profile.status !== "active") {
      throw new Error("Active customer profile required");
    }

    const { data: roles, error: rolesError } = await admin
      .from("user_roles").select("role").eq("user_id", context.userId).eq("tenant_id", profile.tenant_id);
    if (rolesError || !(roles ?? []).some((row: any) => row.role === "customer")) {
      throw new Error("Customer account required");
    }

    const now = new Date().toISOString();
    const { data: pending, error: pendingError } = await (admin as any)
      .from("customer_portal_invitations")
      .select("id,customer_id,email")
      .eq("tenant_id", profile.tenant_id)
      .eq("invited_user_id", context.userId)
      .eq("status", "pending")
      .gt("expires_at", now);
    if (pendingError) throw new Error("Unable to verify the customer invitation");

    for (const invitation of pending ?? []) {
      if (String(invitation.email).toLowerCase() !== String(profile.email).toLowerCase()) continue;
      const { data: customer, error: customerError } = await admin.from("customers")
        .select("id,owner_user_id")
        .eq("id", invitation.customer_id)
        .eq("tenant_id", profile.tenant_id)
        .maybeSingle();
      if (customerError || !customer || customer.owner_user_id !== context.userId) continue;

      const { error } = await (admin as any).from("customer_portal_invitations")
        .update({
          status: "accepted",
          accepted_user_id: context.userId,
          accepted_at: now,
        })
        .eq("id", invitation.id)
        .eq("status", "pending");
      if (error) throw new Error("Unable to mark the customer invitation as accepted");
    }

    return { ok: true };
  });
