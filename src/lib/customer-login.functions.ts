import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function assertCompanyAdminTenant(ctx: Ctx): Promise<string> {
  const { data } = await ctx.supabase
    .from("user_roles").select("role,tenant_id").eq("user_id", ctx.userId)
    .in("role", ["super_admin", "admin"]).limit(1).maybeSingle();
  if (!data?.tenant_id) throw new Error("Forbidden: company admins only");
  return data.tenant_id as string;
}

/**
 * Create a login for an existing customer so they can track their own
 * projects in the customer portal. Uses ordinary public sign-up (no
 * service-role key), then links the customer record and assigns the role.
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
    const tenantId = await assertCompanyAdminTenant(context);

    const { data: cust, error: cErr } = await context.supabase
      .from("customers").select("id, tenant_id, name, email, owner_user_id")
      .eq("id", data.customer_id).maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cust || cust.tenant_id !== tenantId) throw new Error("Customer not found");

    const { signUpAppUser } = await import("./provision.server");
    const uid = await signUpAppUser({
      email: data.email,
      password: data.password,
      metadata: { full_name: data.full_name ?? cust.name, tenant_id: tenantId },
    });

    await context.supabase.from("profiles").update({
      email: data.email,
      full_name: data.full_name ?? cust.name,
      status: "active",
    }).eq("id", uid);

    await context.supabase.from("user_roles").delete().eq("user_id", uid);
    const { error: rErr } = await context.supabase.from("user_roles")
      .insert({ user_id: uid, role: "customer", tenant_id: tenantId });
    if (rErr) throw new Error(rErr.message);

    const { error: linkErr } = await context.supabase.from("customers")
      .update({ owner_user_id: uid, email: cust.email ?? data.email })
      .eq("id", data.customer_id);
    if (linkErr) throw new Error(linkErr.message);

    return { ok: true, user_id: uid, email: data.email };
  });
