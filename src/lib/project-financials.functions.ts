import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const FINANCE_VIEW_ROLES = new Set([
  "super_admin", "platform_admin", "admin", "executive",
  "finance", "finance_officer", "risk_compliance_officer",
]);
const FINANCE_WRITE_ROLES = new Set([
  "super_admin", "platform_admin", "admin", "executive",
  "finance", "finance_officer",
]);

async function getFinancialAccess(userId: string, projectId: string) {
  const admin = await getAdmin();
  const { data: profile, error: profileError } = await admin
    .from("profiles").select("tenant_id,status").eq("id", userId).maybeSingle();
  if (profileError || !profile?.tenant_id || profile.status !== "active") {
    throw new Error("Forbidden: active account and tenant required");
  }

  const { data: roles, error: rolesError } = await admin
    .from("user_roles").select("role").eq("user_id", userId).eq("tenant_id", profile.tenant_id);
  if (rolesError) throw new Error("Unable to verify account permissions");
  const roleNames = (roles ?? []).map((row: any) => row.role);
  const isFinanceStaff = roleNames.some((role: string) => FINANCE_VIEW_ROLES.has(role));

  const { data: project, error: projectError } = await admin.from("projects")
    .select("id,name,tenant_id,customer_id,expected_value,status")
    .eq("id", projectId).eq("tenant_id", profile.tenant_id).maybeSingle();
  if (projectError || !project) throw new Error("Project not found in your company");

  const { data: customer, error: customerError } = await admin.from("customers")
    .select("id,name,owner_user_id,tenant_id")
    .eq("id", project.customer_id).eq("tenant_id", profile.tenant_id).maybeSingle();
  if (customerError || !customer) throw new Error("Customer record not found");

  const isCustomerOwner = customer.owner_user_id === userId && roleNames.includes("customer");
  if (!isFinanceStaff && !isCustomerOwner) {
    throw new Error("Financial records are available only to the linked customer account or authorized finance staff.");
  }

  return {
    admin,
    tenantId: profile.tenant_id as string,
    project,
    customer,
    isCustomer: !isFinanceStaff,
    roleNames,
  };
}

export const getCustomerProjectFinancialSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ project_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { admin, tenantId, project, customer, isCustomer } =
      await getFinancialAccess(context.userId, data.project_id);

    const { data: appraisals, error: appraisalError } = await (admin as any)
      .from("appraisals")
      .select("id,requested_amount,recommended_amount,status,created_at")
      .eq("project_id", project.id)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (appraisalError) throw new Error("Unable to load project financing requests");

    const appraisalIds = (appraisals ?? []).map((row: any) => row.id);
    const [appraisalLoansResult, directLoansResult] = await Promise.all([
      appraisalIds.length
        ? (admin as any).from("loan_facilities")
            .select("id,appraisal_id,approved_amount,status,interest_rate,tenor_months,repayment_frequency,activated_at,created_at")
            .eq("tenant_id", tenantId)
            .in("appraisal_id", appraisalIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      (admin as any).from("loan_facilities")
        .select("id,appraisal_id,approved_amount,status,interest_rate,tenor_months,repayment_frequency,activated_at,created_at")
        .eq("tenant_id", tenantId)
        .eq("project_id", project.id),
    ]);
    if (appraisalLoansResult.error || directLoansResult.error) {
      throw new Error("Unable to load approved financing facilities");
    }

    const loanMap = new Map<string, any>();
    for (const loan of [...(appraisalLoansResult.data ?? []), ...(directLoansResult.data ?? [])]) {
      loanMap.set(loan.id, loan);
    }
    const loans = [...loanMap.values()];
    const loanIds = loans.map((loan: any) => loan.id);

    const drawdownResult = loanIds.length
      ? await (admin as any).from("drawdown_requests")
          .select("id,loan_id,milestone_id,requested_amount,certified_amount,status,created_at")
          .in("loan_id", loanIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };
    if (drawdownResult.error) throw new Error("Unable to load drawdown history");
    const drawdowns = drawdownResult.data ?? [];
    const drawdownIds = drawdowns.map((row: any) => row.id);

    const [paymentResult, repaymentResult, contributionResult] = await Promise.all([
      drawdownIds.length
        ? (admin as any).from("payments")
            .select("id,drawdown_id,amount,purpose,status,created_at")
            .in("drawdown_id", drawdownIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as any[], error: null }),
      loanIds.length
        ? (admin as any).from("repayments")
            .select("id,loan_id,amount,payment_date,allocation_principal,allocation_interest,reference,source,created_at")
            .in("loan_id", loanIds)
            .order("payment_date", { ascending: false })
        : Promise.resolve({ data: [] as any[], error: null }),
      (admin as any).from("project_customer_contributions")
        .select("id,amount,contribution_date,method,reference,notes,status,created_at")
        .eq("project_id", project.id)
        .eq("tenant_id", tenantId)
        .order("contribution_date", { ascending: false }),
    ]);
    if (paymentResult.error || repaymentResult.error || contributionResult.error) {
      throw new Error("Unable to load the full project financial history");
    }

    const payments = paymentResult.data ?? [];
    const repayments = repaymentResult.data ?? [];
    const contributions = (contributionResult.data ?? [])
      .filter((row: any) => !isCustomer || row.status === "confirmed");

    const requestedFinancing = (appraisals ?? [])
      .reduce((sum: number, row: any) => sum + (Number(row.requested_amount) || 0), 0);
    const approvedFinancing = loans
      .filter((row: any) => ["active", "completed", "closed"].includes(String(row.status).toLowerCase()))
      .reduce((sum: number, row: any) => sum + (Number(row.approved_amount) || 0), 0);
    const confirmedContributions = contributions
      .filter((row: any) => row.status === "confirmed")
      .reduce((sum: number, row: any) => sum + (Number(row.amount) || 0), 0);
    const completedPayments = payments
      .filter((row: any) => ["paid", "completed"].includes(String(row.status).toLowerCase()))
      .reduce((sum: number, row: any) => sum + (Number(row.amount) || 0), 0);
    const totalRepayments = repayments
      .reduce((sum: number, row: any) => sum + (Number(row.amount) || 0), 0);

    return {
      project: { id: project.id, name: project.name, expected_value: project.expected_value, status: project.status },
      customer: { name: customer.name },
      isCustomer,
      appraisals: appraisals ?? [],
      loans,
      drawdowns,
      payments,
      repayments,
      contributions,
      totals: {
        requestedFinancing,
        approvedFinancing,
        confirmedContributions,
        completedPayments,
        totalRepayments,
      },
    };
  });

export const recordProjectCustomerContribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    project_id: z.string().uuid(),
    amount: z.number().positive().max(1_000_000_000_000),
    contribution_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    method: z.enum(["cash", "bank_transfer", "mobile_money", "cheque", "other"]),
    reference: z.string().max(200).optional().default(""),
    notes: z.string().max(2000).optional().default(""),
    status: z.enum(["pending", "confirmed"]).default("confirmed"),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { admin, tenantId, project, roleNames } =
      await getFinancialAccess(context.userId, data.project_id);
    if (!roleNames.some((role: string) => FINANCE_WRITE_ROLES.has(role))) {
      throw new Error("Only authorized finance staff can record customer contributions");
    }

    const { data: contribution, error } = await (admin as any)
      .from("project_customer_contributions")
      .insert({
        project_id: project.id,
        tenant_id: tenantId,
        amount: data.amount,
        contribution_date: data.contribution_date,
        method: data.method,
        reference: data.reference.trim(),
        notes: data.notes.trim(),
        status: data.status,
        recorded_by: context.userId,
      })
      .select("*")
      .single();
    if (error || !contribution) throw new Error("Unable to record the customer contribution");

    const { error: auditError } = await (admin as any).from("audit_logs").insert({
      tenant_id: tenantId,
      user_id: context.userId,
      action: "create",
      entity_type: "project_customer_contribution",
      entity_id: contribution.id,
      old_value: null,
      new_value: contribution,
    });
    if (auditError) {
      await (admin as any).from("project_customer_contributions")
        .delete().eq("id", contribution.id).eq("tenant_id", tenantId);
      throw new Error("Contribution was not saved because its audit record failed. Please retry.");
    }

    return { ok: true, contribution };
  });
