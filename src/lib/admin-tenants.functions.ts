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

/**
 * Provision a new company plus its first Company Admin without any
 * service-role key: an ordinary public sign-up carrying the company name,
 * which the `handle_new_user` database trigger turns into the tenant, its
 * settings, the admin profile and the super_admin role.
 */
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
    await assertPlatformAdminViaRls(context);
    if (data.mode === "password" && (!data.password || data.password.length < 8)) {
      throw new Error("Password is required (min 8 characters) when setting credentials manually");
    }

    const { signUpAppUser, sendPasswordResetEmail, optionalAdminClient } =
      await import("./provision.server");

    // Invite mode: sign up with a random password, then email a set-password link.
    const initialPassword = data.mode === "password"
      ? data.password!
      : `Tmp-${crypto.randomUUID()}`;

    const uid = await signUpAppUser({
      email: data.admin_email,
      password: initialPassword,
      metadata: {
        full_name: data.admin_full_name,
        company_name: data.company_name,
      },
    });

    if (data.mode === "invite") {
      await sendPasswordResetEmail(data.admin_email);
    }

    // The new company is outside the caller's own tenant, so its id is only
    // readable with elevated access; it is optional here.
    let tenantId: string | null = null;
    const admin = await optionalAdminClient();
    if (admin) {
      const { data: prof } = await admin.from("profiles")
        .select("tenant_id").eq("id", uid).maybeSingle();
      tenantId = (prof?.tenant_id as string) ?? null;
    }

    return { tenant_id: tenantId, user_id: uid, mode: data.mode };
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

export const getCompanyDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tenant_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.userId);
    const admin = await getAdmin();
    const tid = data.tenant_id;

    const [tenant, settings, users, roles, customers, projects, loans, payments] = await Promise.all([
      admin.from("tenants").select("*").eq("id", tid).maybeSingle(),
      admin.from("tenant_settings").select("*").eq("tenant_id", tid).maybeSingle(),
      admin.from("profiles").select("id,email,full_name,phone,status,created_at").eq("tenant_id", tid).order("created_at", { ascending: false }),
      admin.from("user_roles").select("user_id,role").eq("tenant_id", tid),
      admin.from("customers").select("id,name,type,status,created_at").eq("tenant_id", tid).order("created_at", { ascending: false }).limit(50),
      admin.from("projects").select("id,name,status,budget_amount,created_at").eq("tenant_id", tid).order("created_at", { ascending: false }).limit(50),
      admin.from("loan_facilities").select("id,account_number,status,approved_amount,created_at").eq("tenant_id", tid).order("created_at", { ascending: false }).limit(50),
      admin.from("payments").select("id,amount,status,created_at").eq("tenant_id", tid).order("created_at", { ascending: false }).limit(50),
    ]);

    if (!tenant.data) throw new Error("Company not found");
    const rolesByUser: Record<string, string[]> = {};
    (roles.data ?? []).forEach((r) => { (rolesByUser[r.user_id] ??= []).push(r.role as string); });
    const usersWithRoles = (users.data ?? []).map((u) => ({ ...u, roles: rolesByUser[u.id] ?? [] }));

    return {
      tenant: tenant.data,
      settings: settings.data ?? null,
      users: usersWithRoles,
      customers: customers.data ?? [],
      projects: projects.data ?? [],
      loans: loans.data ?? [],
      payments: payments.data ?? [],
    };
  });


