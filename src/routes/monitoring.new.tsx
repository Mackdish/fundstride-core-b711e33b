import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { Field, Section, fieldCls } from "@/components/form-fields";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/monitoring/new")({
  component: () => (
    <ProtectedRoute roles={["super_admin", "credit_officer", "risk_compliance_officer"]}>
      <NewMonitoring />
    </ProtectedRoute>
  ),
});

const RISK_LEVELS = ["Low", "Medium", "High"];
const RISK_AREAS = ["repayment", "cashflow", "collateral", "operational", "sector", "compliance"];
const WARNING_INDICATORS = [
  "Declining account turnover",
  "Missed or delayed installments",
  "Reduced business activity",
  "Customer complaints",
  "Project delays",
  "Unpaid suppliers or contractors",
  "Cheque / e-payment reversals",
  "Insurance lapse",
  "Collateral deterioration",
  "Borrower communication gaps",
];
const ACTIONS = [
  "Continue normal monitoring",
  "Issue reminder notice",
  "Restructure facility",
  "Intensify collection follow-up",
  "Request additional security",
  "Conduct valuation review",
  "Escalate to Credit Committee",
  "Initiate recovery / legal process",
];

function NewMonitoring() {
  const { user } = useAuth();
  const nav = useNavigate();

  const { data: loans } = useQuery({
    queryKey: ["mon-loans"],
    queryFn: async () =>
      (
        await supabase
          .from("loan_facilities")
          .select("id,approved_amount,interest_rate,tenor_months,account_number,product_type,security_offered,customer_id,project_id,relationship_manager")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const { data: customers } = useQuery({
    queryKey: ["mon-customers"],
    queryFn: async () => (await supabase.from("customers").select("id,name").order("name")).data ?? [],
  });
  const { data: reps } = useQuery({
    queryKey: ["mon-reps"],
    queryFn: async () => (await supabase.from("repayments").select("loan_id,amount,payment_date").order("payment_date", { ascending: false })).data ?? [],
  });
  const { data: sched } = useQuery({
    queryKey: ["mon-sched"],
    queryFn: async () => (await supabase.from("repayment_schedules").select("loan_id,instalment_date,total,status").order("instalment_date")).data ?? [],
  });

  const [f, setF] = useState<any>({
    loan_id: "", customer_id: "", project_id: "",
    report_date: new Date().toISOString().slice(0, 10),
    relationship_officer: "",
    // 1. Borrower (auto from loan)
    product_type: "", approved_amount: "", outstanding_balance: "", tenor: "", interest_rate: "", security: "",
    // 2. Performance
    last_payment_date: "", next_installment_due: "", total_paid: "",
    outstanding_principal: "", accrued_interest: "", fees_penalties: "",
    // 3. Repayment
    repayment_status: "current", days_past_due: 0, arrears_amount: 0, missed_installments: 0,
    partial_payments: "", payment_trend: "Stable", repayment_concerns: "",
    // 4. Business
    biz_status: "", revenue_trend: "Stable", site_progress: "", delays: "",
    supplier_issues: "", market_performance: "",
    // 5. Collateral
    coll_description: "", coll_value: "", insurance_status: "Active",
    valuation_expiry: "", legal_docs_status: "In order", impairment: "",
    // 6. Risk
    risk: Object.fromEntries(RISK_AREAS.map((k) => [k, { level: "Low", comment: "" }])),
    // 7. Warnings
    warnings: [] as string[],
    // 8. Engagement
    eng_date: "", eng_person: "", eng_obs: "", eng_docs: "", eng_explanation: "", eng_comments: "",
    // 9 + 10
    actions: [] as string[],
    officer_recommendation: "",
    status: "draft",
  });

  // Auto-fill from loan + compute outstanding/dpd/last payment
  useEffect(() => {
    if (!f.loan_id) return;
    const ln = loans?.find((l: any) => l.id === f.loan_id);
    if (!ln) return;
    const loanReps = (reps ?? []).filter((r: any) => r.loan_id === f.loan_id);
    const totalPaid = loanReps.reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
    const last = loanReps[0];
    const loanSched = (sched ?? []).filter((s: any) => s.loan_id === f.loan_id);
    const overdue = loanSched.filter((s: any) => s.status === "pending" && new Date(s.instalment_date) < new Date());
    const next = loanSched.find((s: any) => s.status === "pending" && new Date(s.instalment_date) >= new Date());
    const arrears = overdue.reduce((s: number, x: any) => s + Number(x.total ?? 0), 0);
    const oldest = overdue[0];
    const dpd = oldest ? Math.floor((Date.now() - new Date(oldest.instalment_date).getTime()) / 86400_000) : 0;

    setF((p: any) => ({
      ...p,
      customer_id: ln.customer_id,
      project_id: ln.project_id,
      product_type: ln.product_type ?? "",
      approved_amount: ln.approved_amount,
      tenor: ln.tenor_months,
      interest_rate: ln.interest_rate,
      security: ln.security_offered ?? "",
      relationship_officer: p.relationship_officer || ln.relationship_manager || "",
      total_paid: totalPaid,
      outstanding_balance: Number(ln.approved_amount) - totalPaid,
      last_payment_date: last?.payment_date ?? "",
      next_installment_due: next?.instalment_date ?? "",
      arrears_amount: arrears,
      days_past_due: dpd,
      missed_installments: overdue.length,
      repayment_status: dpd === 0 ? "current" : dpd <= 30 ? "delayed" : "irregular",
    }));
  }, [f.loan_id, loans, reps, sched]);

  const set = (k: string) => (e: any) => setF((p: any) => ({ ...p, [k]: e.target.value }));
  const setRisk = (area: string, field: "level" | "comment") => (e: any) =>
    setF((p: any) => ({ ...p, risk: { ...p.risk, [area]: { ...p.risk[area], [field]: e.target.value } } }));
  const toggleArr = (key: "warnings" | "actions", v: string) => () =>
    setF((p: any) => ({ ...p, [key]: p[key].includes(v) ? p[key].filter((x: string) => x !== v) : [...p[key], v] }));

  const submit = async (e: any) => {
    e.preventDefault();
    if (!f.loan_id) return toast.error("Select a loan facility");
    try {
      const { data, error } = await supabase.from("credit_monitoring_reports").insert({
        loan_id: f.loan_id, customer_id: f.customer_id || null, project_id: f.project_id || null,
        report_date: f.report_date, relationship_officer: f.relationship_officer,
        performance: {
          outstanding_balance: f.outstanding_balance, last_payment_date: f.last_payment_date,
          next_installment_due: f.next_installment_due, total_paid: f.total_paid,
          outstanding_principal: f.outstanding_principal, accrued_interest: f.accrued_interest, fees_penalties: f.fees_penalties,
        },
        repayment_status: f.repayment_status,
        days_past_due: Number(f.days_past_due ?? 0),
        arrears_amount: Number(f.arrears_amount ?? 0),
        missed_installments: Number(f.missed_installments ?? 0),
        payment_trend: f.payment_trend, repayment_concerns: f.repayment_concerns,
        business_progress: {
          status: f.biz_status, revenue_trend: f.revenue_trend, site_progress: f.site_progress,
          delays: f.delays, supplier_issues: f.supplier_issues, market: f.market_performance,
        },
        collateral_status: {
          description: f.coll_description, value: f.coll_value, insurance: f.insurance_status,
          valuation_expiry: f.valuation_expiry, legal: f.legal_docs_status, impairment: f.impairment,
        },
        risk_assessment: f.risk,
        warning_indicators: f.warnings,
        engagement_notes: {
          date: f.eng_date, person_met: f.eng_person, observations: f.eng_obs,
          documents: f.eng_docs, explanation: f.eng_explanation, officer_comments: f.eng_comments,
        },
        recommended_actions: f.actions,
        officer_recommendation: f.officer_recommendation,
        prepared_by: user?.id, status: f.status,
      }).select("id").single();
      if (error) throw error;
      await logAudit("create", "credit_monitoring_report", data!.id, null, { loan_id: f.loan_id });
      toast.success("Monitoring report created");
      nav({ to: "/monitoring" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5 pb-10">
      <PageHeader title="New credit monitoring report" description="Periodic monitoring with early-warning indicators and recommended actions." />

      <Section title="1. Borrower Details" description="Select a loan to auto-populate facility, customer, and ledger figures.">
        <Field label="Loan Facility *">
          <select className={fieldCls} value={f.loan_id} onChange={set("loan_id")}>
            <option value="">Select facility…</option>
            {loans?.map((l: any) => (
              <option key={l.id} value={l.id}>
                {l.account_number ?? l.id.slice(0, 8)} · {l.product_type ?? "—"} · KES {Number(l.approved_amount).toLocaleString()}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Customer">
          <select className={fieldCls} value={f.customer_id} onChange={set("customer_id")}>
            <option value="">—</option>
            {customers?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Product Type"><input className={fieldCls} value={f.product_type} onChange={set("product_type")} readOnly /></Field>
        <Field label="Approved Facility Amount"><input className={fieldCls} value={f.approved_amount} readOnly /></Field>
        <Field label="Outstanding Balance"><input className={fieldCls} value={f.outstanding_balance} readOnly /></Field>
        <Field label="Tenor (months)"><input className={fieldCls} value={f.tenor} readOnly /></Field>
        <Field label="Interest Rate (%)"><input className={fieldCls} value={f.interest_rate} readOnly /></Field>
        <Field label="Security / Collateral"><input className={fieldCls} value={f.security} onChange={set("security")} /></Field>
        <Field label="Relationship Officer"><input className={fieldCls} value={f.relationship_officer} onChange={set("relationship_officer")} /></Field>
        <Field label="Report Date"><input type="date" className={fieldCls} value={f.report_date} onChange={set("report_date")} /></Field>
      </Section>

      <Section title="2. Facility Performance Summary" description="Last payment, next installment, and totals auto-pull from the ledger.">
        <Field label="Last Payment Date"><input type="date" className={fieldCls} value={f.last_payment_date} onChange={set("last_payment_date")} /></Field>
        <Field label="Next Installment Due"><input type="date" className={fieldCls} value={f.next_installment_due} onChange={set("next_installment_due")} /></Field>
        <Field label="Total Amount Paid to Date"><input type="number" className={fieldCls} value={f.total_paid} onChange={set("total_paid")} /></Field>
        <Field label="Outstanding Principal"><input type="number" className={fieldCls} value={f.outstanding_principal} onChange={set("outstanding_principal")} /></Field>
        <Field label="Accrued Interest"><input type="number" className={fieldCls} value={f.accrued_interest} onChange={set("accrued_interest")} /></Field>
        <Field label="Fees / Penalties"><input type="number" className={fieldCls} value={f.fees_penalties} onChange={set("fees_penalties")} /></Field>
      </Section>

      <Section title="3. Repayment Conduct">
        <Field label="Current Repayment Status">
          <select className={fieldCls} value={f.repayment_status} onChange={set("repayment_status")}>
            <option value="current">Current</option><option value="delayed">Delayed</option><option value="irregular">Irregular</option>
          </select>
        </Field>
        <Field label="Days Past Due"><input type="number" className={fieldCls} value={f.days_past_due} onChange={set("days_past_due")} /></Field>
        <Field label="Arrears Amount"><input type="number" className={fieldCls} value={f.arrears_amount} onChange={set("arrears_amount")} /></Field>
        <Field label="Missed Installments"><input type="number" className={fieldCls} value={f.missed_installments} onChange={set("missed_installments")} /></Field>
        <Field label="Partial Payments Made"><input className={fieldCls} value={f.partial_payments} onChange={set("partial_payments")} /></Field>
        <Field label="Payment Trend">
          <select className={fieldCls} value={f.payment_trend} onChange={set("payment_trend")}>
            <option>Improving</option><option>Stable</option><option>Deteriorating</option>
          </select>
        </Field>
        <Field label="Key Repayment Concerns" className="sm:col-span-2"><textarea className={fieldCls + " h-20 py-2"} value={f.repayment_concerns} onChange={set("repayment_concerns")} /></Field>
      </Section>

      <Section title="4. Business / Project Progress Update">
        <Field label="Current Business / Project Status"><input className={fieldCls} value={f.biz_status} onChange={set("biz_status")} /></Field>
        <Field label="Revenue / Cash Flow Trend">
          <select className={fieldCls} value={f.revenue_trend} onChange={set("revenue_trend")}>
            <option>Growing</option><option>Stable</option><option>Declining</option>
          </select>
        </Field>
        <Field label="Site / Project Progress" className="sm:col-span-2"><textarea className={fieldCls + " h-20 py-2"} value={f.site_progress} onChange={set("site_progress")} /></Field>
        <Field label="Delays / Disruptions" className="sm:col-span-2"><textarea className={fieldCls + " h-20 py-2"} value={f.delays} onChange={set("delays")} /></Field>
        <Field label="Supplier / Contractor Issues"><input className={fieldCls} value={f.supplier_issues} onChange={set("supplier_issues")} /></Field>
        <Field label="Customer / Market Performance"><input className={fieldCls} value={f.market_performance} onChange={set("market_performance")} /></Field>
      </Section>

      <Section title="5. Collateral / Security Status">
        <Field label="Collateral Description"><input className={fieldCls} value={f.coll_description} onChange={set("coll_description")} /></Field>
        <Field label="Current Estimated Value (KES)"><input type="number" className={fieldCls} value={f.coll_value} onChange={set("coll_value")} /></Field>
        <Field label="Insurance Status">
          <select className={fieldCls} value={f.insurance_status} onChange={set("insurance_status")}>
            <option>Active</option><option>Expired</option><option>Not Insured</option>
          </select>
        </Field>
        <Field label="Valuation Expiry Date"><input type="date" className={fieldCls} value={f.valuation_expiry} onChange={set("valuation_expiry")} /></Field>
        <Field label="Legal Documentation Status">
          <select className={fieldCls} value={f.legal_docs_status} onChange={set("legal_docs_status")}>
            <option>In order</option><option>Pending</option><option>Missing</option>
          </select>
        </Field>
        <Field label="Impairment / Risk to Security"><input className={fieldCls} value={f.impairment} onChange={set("impairment")} /></Field>
      </Section>

      <Section title="6. Risk Assessment">
        <div className="sm:col-span-2 grid gap-2">
          {RISK_AREAS.map((area) => (
            <div key={area} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3 text-sm capitalize">{area} risk</div>
              <select className={fieldCls + " col-span-3"} value={f.risk[area].level} onChange={setRisk(area, "level")}>
                {RISK_LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
              <input className={fieldCls + " col-span-6"} placeholder="Comment…" value={f.risk[area].comment} onChange={setRisk(area, "comment")} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="7. Early Warning Indicators">
        <div className="sm:col-span-2 grid sm:grid-cols-2 gap-2">
          {WARNING_INDICATORS.map((w) => (
            <label key={w} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.warnings.includes(w)} onChange={toggleArr("warnings", w)} /> {w}
            </label>
          ))}
        </div>
      </Section>

      <Section title="8. Site Visit / Client Engagement Notes">
        <Field label="Date of Visit / Contact"><input type="date" className={fieldCls} value={f.eng_date} onChange={set("eng_date")} /></Field>
        <Field label="Person Met"><input className={fieldCls} value={f.eng_person} onChange={set("eng_person")} /></Field>
        <Field label="Observations" className="sm:col-span-2"><textarea className={fieldCls + " h-20 py-2"} value={f.eng_obs} onChange={set("eng_obs")} /></Field>
        <Field label="Photos / Documents Reviewed"><input className={fieldCls} value={f.eng_docs} onChange={set("eng_docs")} /></Field>
        <Field label="Client Explanation"><input className={fieldCls} value={f.eng_explanation} onChange={set("eng_explanation")} /></Field>
        <Field label="Officer's Comments" className="sm:col-span-2"><textarea className={fieldCls + " h-20 py-2"} value={f.eng_comments} onChange={set("eng_comments")} /></Field>
      </Section>

      <Section title="9. Recommended Actions">
        <div className="sm:col-span-2 grid sm:grid-cols-2 gap-2">
          {ACTIONS.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.actions.includes(a)} onChange={toggleArr("actions", a)} /> {a}
            </label>
          ))}
        </div>
      </Section>

      <Section title="10. Officer's Recommendation">
        <Field label="Recommendation Narrative" className="sm:col-span-2">
          <textarea className={fieldCls + " h-28 py-2"} value={f.officer_recommendation} onChange={set("officer_recommendation")} />
        </Field>
        <Field label="Status">
          <select className={fieldCls} value={f.status} onChange={set("status")}>
            <option value="draft">Draft</option><option value="submitted">Submitted</option>
          </select>
        </Field>
      </Section>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => nav({ to: "/monitoring" })} className="px-4 h-10 rounded-md border border-slate-200 text-sm bg-white">Cancel</button>
        <button type="submit" className="px-5 h-10 rounded-md bg-[#1E3A5F] text-white text-sm font-medium">Create monitoring report</button>
      </div>
    </form>
  );
}
