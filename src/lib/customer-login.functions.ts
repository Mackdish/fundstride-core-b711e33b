import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertStaffAndGetTenant(userId: string): Promise<string> {
  const admin = await getAdmin();
  const { data: prof } = await admin
    .from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
  if (!prof?.tenant_id) throw new Error("Forbidden: no tenant");
  const { data: roles } = await admin
    .from("user_roles").select("role").eq("user_id", userId).eq("tenant_id", prof.tenant_id);
  const staffRoles = new Set([
    "super_admin","admin","executive","finance","credit","operations",
    "credit_officer","operations_officer","site_monitoring_officer",
    "finance_officer","risk_compliance_officer",
  ]);
  const isStaff = (roles ?? []).some((r: any) => staffRoles.has(r.role));
  if (!isStaff) throw new Error("Forbidden: staff only");
  return prof.tenant_id as string;
}

/**
 * Create (or link) an auth login for an existing customer so they can view
 * their own projects in the customer portal. Sets customers.owner_user_id and
 * assigns the 'customer' role.
 */
export const createCustomerLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    customer_id: z.string().uuid(),
    email: z.string().email(),
    password: z.string().min(8).max(72),
    full_name: z.string().min(1).max(120).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await assertStaffAndGetTenant(context.userId);
    const admin = await getAdmin();

    // Confirm the customer belongs to this tenant.
    const { data: cust, error: cErr } = await admin
      .from("customers").select("id, tenant_id, name, email, owner_user_id")
      .eq("id", data.customer_id).maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cust || cust.tenant_id !== tenantId) throw new Error("Customer not found");

    // Find existing auth user by email, otherwise create one.
    let uid: string | null = null;
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (existing) {
      uid = existing.id;
      const { error: upErr } = await admin.auth.admin.updateUserById(uid, {
        password: data.password, email_confirm: true,
      } as any);
      if (upErr) throw new Error(upErr.message);
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          full_name: data.full_name ?? cust.name,
          tenant_id: tenantId,
        },
      });
      if (error || !created.user) throw new Error(error?.message ?? "Failed to create login");
      uid = created.user.id;
    }

    // Ensure profile in same tenant.
    await admin.from("profiles").upsert({
      id: uid, email: data.email,
      full_name: data.full_name ?? cust.name,
      tenant_id: tenantId, status: "active",
    });

    // Assign the customer role (idempotent).
    await admin.from("user_roles")
      .delete().eq("user_id", uid).eq("role", "customer");
    const { error: rErr } = await admin.from("user_roles")
      .insert({ user_id: uid, role: "customer", tenant_id: tenantId });
    if (rErr) throw new Error(rErr.message);

    // Link the customer record to the login and record contact email.
    const { error: linkErr } = await admin.from("customers")
      .update({ owner_user_id: uid, email: cust.email ?? data.email })
      .eq("id", data.customer_id);
    if (linkErr) throw new Error(linkErr.message);

    return { ok: true, user_id: uid, email: data.email };
  });
