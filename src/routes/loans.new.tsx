import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { Field, Section, fieldCls } from "@/components/form-fields";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/loans/new")({
  component: () => (
    <ProtectedRoute roles={["super_admin", "credit_officer", "risk_compliance_officer"]}>
      <NewLoan />
    </ProtectedRoute>
  ),
});

const PRODUCT_TYPES = ["Construction Loan", "Mortgage", "Working Capital", "Asset Finance", "Bridging Loan", "Term Loan"];
const REPAYMENT_FREQS = ["monthly", "quarterly", "semi-annual", "annual", "bullet"];
const SECURITY_TYPES = ["Land Title (LR)", "Apartment / Sectional Title", "Commercial Property", "Personal Guarantee", "Corporate Guarantee", "Cash Cover", "Chattels Mortgage"];
const CRB_STATUSES = ["Clean", "Listed - Resolved", "Listed - Active", "Not Checked"];
const STAGE_OPTIONS = ["Stage 1 - Performing", "Stage 2 - Underperforming (SICR)", "Stage 3 - Non-performing"];
const RISK_LEVELS = ["Low", "Medium", "High"];

function NewLoan() {
  const { user } = useAuth();
  const nav = useNavigate();

  const { data: customers } = useQuery({
    queryKey: ["loan-customers"],
    queryFn: async () => (await supabase.from("customers").select("id,name").order("name")).data ?? [],
  });
  const { data: projects } = useQuery({
    queryKey: ["loan-projects"],
    queryFn: async () => (await supabase.from("projects").select("id,name,customer_id,expected_value").order("name")).data ?? [],
  });
  const { data: loanProducts } = useQuery({
    queryKey: ["loan-products-active"],
    queryFn: async () => (await supabase.from("loan_products").select("*").eq("status", "active").order("name")).data ?? [],
  });
  const { data: staff } = useQuery({
    queryKey: ["loan-rm-staff"],
    queryFn: async () => (await supabase.from("profiles").select("id,full_name,email,job_title").order("full_name")).data ?? [],
  });

  const [f, setF] = useState<any>({
    customer_id: "", project_id: "", product_type: "Construction Loan",
    requested_amount: "", recommended_amount: "", loan_purpose: "",
    tenor_months: 36, interest_rate: 14, repayment_frequency: "monthly",
    security_offered: "Land Title (LR)", equity_contribution: "",
    relationship_manager: "",
    repayment_holiday_months: "", repayment_holiday_amount: "", repayment_holiday_notes: "",
    // Executive
    customer_background: "", facility_purpose: "", exec_recommendation: "",
    // Character /20
    management_experience: "", industry_reputation: "", integrity_assessment: "",
    crb_status: "Clean", litigation_search: "None", character_score: 15,
    // Capacity /25
    revenue: "", gross_profit: "", net_profit: "", operating_expenses: "",
    avg_monthly_credits: "", avg_monthly_debits: "", debt_service_ratio: "",
    dscr: "", capacity_score: 18,
    // Capital /15
    net_worth: "", capital_equity: "", assets_owned: "", working_capital: "", capital_score: 10,
    // Collateral /20
    security_type: "Land Title (LR)", market_value: "", forced_sale_value: "",
    coverage_pct: "", collateral_score: 15,
    // Conditions /10
    market_outlook: "", competition: "", regulatory_env: "", sector_risks: "", conditions_score: 7,
    // Construction /20
    project_name: "", project_location: "", developer: "", contractor: "",
    quantity_surveyor: "", architect: "", project_cost: "", construction_amount: "",
    construction_risk_score: 14,
    // Risk
    credit_risk: "Medium", market_risk: "Medium", operational_risk: "Medium",
    construction_risk: "Medium", legal_risk: "Low", reputation_risk: "Low",
    // IFRS9
    pd: 2.5, lgd: 35, ead: "", stage: "Stage 1 - Performing", ecl: "",
    // Recommendation
    recommendation: "Recommend Approval", approved_amount: "", approved_tenor: 36,
    approved_rate: 14, approved_security: "", conditions_precedent: "",
  });

  // Auto-derive: LTV, coverage %, ECL, total score
  useEffect(() => {
    if (f.market_value && f.requested_amount) {
      const cov = (Number(f.market_value) / Number(f.requested_amount)) * 100;
      if (!isNaN(cov)) setF((p: any) => ({ ...p, coverage_pct: cov.toFixed(1) }));
    }
  }, [f.market_value, f.requested_amount]);

  useEffect(() => {
    if (f.pd && f.lgd && f.ead) {
      const ecl = (Number(f.pd) / 100) * (Number(f.lgd) / 100) * Number(f.ead);
      if (!isNaN(ecl)) setF((p: any) => ({ ...p, ecl: ecl.toFixed(0) }));
    }
  }, [f.pd, f.lgd, f.ead]);

  // Auto-pick project for customer
  useEffect(() => {
    if (f.customer_id && !f.project_id) {
      const p = projects?.find((x) => x.customer_id === f.customer_id);
      if (p) {
        setF((s: any) => ({ ...s, project_id: p.id, project_name: p.name, project_cost: p.expected_value ?? "" }));
      }
    }
  }, [f.customer_id, projects]);

  // Auto-calc repayment holiday amount (interest only) = principal * rate% / 12 * months
  useEffect(() => {
    const principal = Number(f.approved_amount || f.recommended_amount || f.requested_amount || 0);
    const rate = Number(f.approved_rate || f.interest_rate || 0);
    const months = Number(f.repayment_holiday_months || 0);
    if (principal > 0 && rate > 0 && months > 0) {
      const amt = (principal * (rate / 100) / 12) * months;
      setF((s: any) => ({ ...s, repayment_holiday_amount: amt.toFixed(0) }));
    } else if (!months) {
      setF((s: any) => ({ ...s, repayment_holiday_amount: "" }));
    }
  }, [f.repayment_holiday_months, f.approved_amount, f.recommended_amount, f.requested_amount, f.approved_rate, f.interest_rate]);

  // Auto-calc Character score (/20)
  useEffect(() => {
    let s = 0;
    // CRB (up to 6)
    if (f.crb_status === "Clean") s += 6;
    else if (f.crb_status === "Listed - Resolved") s += 3;
    else if (f.crb_status === "Not Checked") s += 1;
    // Litigation (up to 4)
    const lit = (f.litigation_search || "").toLowerCase().trim();
    if (!lit || lit === "none") s += 4;
    else if (lit.includes("resolved") || lit.includes("settled")) s += 2;
    // Text fields (up to 10)
    if ((f.management_experience || "").length > 3) s += 4;
    if ((f.industry_reputation || "").length > 3) s += 3;
    if ((f.integrity_assessment || "").length > 3) s += 3;
    setF((p: any) => ({ ...p, character_score: Math.min(20, s) }));
  }, [f.crb_status, f.litigation_search, f.management_experience, f.industry_reputation, f.integrity_assessment]);

  // Auto-calc Capacity score (/25)
  useEffect(() => {
    let s = 0;
    const rev = Number(f.revenue || 0);
    const np = Number(f.net_profit || 0);
    const gp = Number(f.gross_profit || 0);
    const opex = Number(f.operating_expenses || 0);
    const cr = Number(f.avg_monthly_credits || 0);
    const db = Number(f.avg_monthly_debits || 0);
    // Revenue > 0 (2)
    if (rev > 0) s += 2;
    // Net profit margin (up to 6)
    if (rev > 0) {
      const npm = (np / rev) * 100;
      if (npm >= 15) s += 6; else if (npm >= 8) s += 4; else if (npm > 0) s += 2;
    }
    // Gross margin (up to 5)
    if (rev > 0) {
      const gm = (gp / rev) * 100;
      if (gm >= 30) s += 5; else if (gm >= 20) s += 3; else if (gm > 0) s += 1;
    }
    // Opex ratio (up to 4)
    if (rev > 0 && opex > 0) {
      const opr = (opex / rev) * 100;
      if (opr <= 40) s += 4; else if (opr <= 60) s += 2; else s += 1;
    }
    // Cashflow: credits vs debits (up to 8)
    if (cr > 0) {
      if (cr >= db * 1.3) s += 8;
      else if (cr >= db * 1.1) s += 6;
      else if (cr >= db) s += 4;
      else s += 1;
    }
    setF((p: any) => ({ ...p, capacity_score: Math.min(25, s) }));
  }, [f.revenue, f.net_profit, f.gross_profit, f.operating_expenses, f.avg_monthly_credits, f.avg_monthly_debits]);


  const totalScore = useMemo(
    () => Number(f.character_score || 0) + Number(f.capacity_score || 0) + Number(f.capital_score || 0) +
          Number(f.collateral_score || 0) + Number(f.conditions_score || 0),
    [f.character_score, f.capacity_score, f.capital_score, f.collateral_score, f.conditions_score],
  );
  const grade = totalScore >= 80 ? "green" : totalScore >= 60 ? "amber" : totalScore >= 40 ? "red" : "dark_red";
  const ltv = f.market_value && f.requested_amount ? Number(f.requested_amount) / Number(f.market_value) : null;

  const set = (k: string) => (e: any) => setF((p: any) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: any) => {
    e.preventDefault();
    if (!f.customer_id || !f.project_id) return toast.error("Customer and project required");
    if (!f.requested_amount) return toast.error("Requested amount required");

    try {
      // 1. Create appraisal first
      const { data: app, error: ae } = await supabase.from("appraisals").insert({
        customer_id: f.customer_id, project_id: f.project_id,
        requested_amount: Number(f.requested_amount),
        recommended_amount: Number(f.recommended_amount || f.requested_amount),
        score: totalScore, grade, dscr: f.dscr ? Number(f.dscr) : null, ltv,
        character_score: Number(f.character_score), capacity_score: Number(f.capacity_score),
        capital_score: Number(f.capital_score), collateral_score: Number(f.collateral_score),
        conditions_score: Number(f.conditions_score), construction_risk_score: Number(f.construction_risk_score),
        executive_summary: { background: f.customer_background, purpose: f.facility_purpose, recommendation: f.exec_recommendation },
        character_data: { management_experience: f.management_experience, industry_reputation: f.industry_reputation, integrity: f.integrity_assessment, crb: f.crb_status, litigation: f.litigation_search },
        capacity_data: { revenue: f.revenue, gross_profit: f.gross_profit, net_profit: f.net_profit, opex: f.operating_expenses, avg_credits: f.avg_monthly_credits, avg_debits: f.avg_monthly_debits, dsr: f.debt_service_ratio, dscr: f.dscr },
        capital_data: { net_worth: f.net_worth, equity: f.capital_equity, assets: f.assets_owned, working_capital: f.working_capital },
        collateral_data: { type: f.security_type, market_value: f.market_value, fsv: f.forced_sale_value, coverage_pct: f.coverage_pct },
        conditions_data: { outlook: f.market_outlook, competition: f.competition, regulatory: f.regulatory_env, sector_risks: f.sector_risks },
        construction_data: { name: f.project_name, location: f.project_location, developer: f.developer, contractor: f.contractor, qs: f.quantity_surveyor, architect: f.architect, cost: f.project_cost, amount: f.construction_amount },
        risk_data: { credit: f.credit_risk, market: f.market_risk, operational: f.operational_risk, construction: f.construction_risk, legal: f.legal_risk, reputation: f.reputation_risk },
        ifrs9_data: { pd: f.pd, lgd: f.lgd, ead: f.ead, stage: f.stage, ecl: f.ecl },
        analyst_recommendation: { decision: f.recommendation, amount: f.approved_amount, tenor: f.approved_tenor, rate: f.approved_rate, security: f.approved_security, conditions: f.conditions_precedent },
        status: "pending", created_by: user?.id,
      }).select("id").single();
      if (ae) throw ae;

      // 2. Create loan facility linked
      const { data: loan, error: le } = await supabase.from("loan_facilities").insert({
        appraisal_id: app!.id, customer_id: f.customer_id, project_id: f.project_id,
        product_type: f.product_type, loan_purpose: f.loan_purpose,
        security_offered: f.security_offered, equity_contribution: f.equity_contribution ? Number(f.equity_contribution) : null,
        requested_amount: Number(f.requested_amount),
        recommended_amount: f.recommended_amount ? Number(f.recommended_amount) : null,
        approved_amount: Number(f.approved_amount || f.recommended_amount || f.requested_amount),
        tenor_months: Number(f.approved_tenor || f.tenor_months),
        interest_rate: Number(f.approved_rate || f.interest_rate),
        repayment_frequency: f.repayment_frequency,
        relationship_manager: f.relationship_manager || null,
        repayment_holiday_months: f.repayment_holiday_months ? Number(f.repayment_holiday_months) : null,
        repayment_holiday_amount: f.repayment_holiday_amount ? Number(f.repayment_holiday_amount) : null,
        repayment_holiday_notes: f.repayment_holiday_notes || null,
        status: "draft",
      }).select("id").single();
      if (le) throw le;

      // 3. Conditions precedent → approval_conditions
      if (f.conditions_precedent) {
        const items = f.conditions_precedent.split("\n").filter(Boolean);
        if (items.length) {
          await supabase.from("approval_conditions").insert(
            items.map((d: string) => ({ appraisal_id: app!.id, description: d.trim(), condition_type: "precedent" })),
          );
        }
      }

      await logAudit("create", "loan_facility", loan!.id, null, { customer_id: f.customer_id });
      toast.success("Loan application created");
      nav({ to: "/loans/$id", params: { id: loan!.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create loan");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5 pb-10">
      <PageHeader title="New loan application" description="Loan Application & Analysis Template — 5C scorecard, IFRS9, recommendation." />

      <Section title="1. Customer Information" description="Select the customer and project — fields auto-link.">
        <Field label="Customer *">
          <select className={fieldCls} value={f.customer_id} onChange={set("customer_id")}>
            <option value="">Select customer…</option>
            {customers?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Project *">
          <select className={fieldCls} value={f.project_id} onChange={set("project_id")}>
            <option value="">Select project…</option>
            {(projects ?? []).filter((p) => !f.customer_id || p.customer_id === f.customer_id).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Relationship Manager"><input className={fieldCls} value={f.relationship_manager} onChange={set("relationship_manager")} /></Field>
      </Section>

      <Section title="2. Facility Request" description={loanProducts && loanProducts.length === 0 ? "Tip: ask your admin to define loan products under Admin → Loan Products to pre-fill defaults." : undefined}>
        <Field label="Product Type">
          <select
            className={fieldCls}
            value={f.product_type}
            onChange={(e) => {
              const name = e.target.value;
              const prod = loanProducts?.find((p: any) => p.name === name);
              setF((s: any) => ({
                ...s,
                product_type: name,
                ...(prod?.default_interest_rate != null ? { interest_rate: prod.default_interest_rate } : {}),
                ...(prod?.default_tenor_months != null ? { tenor_months: prod.default_tenor_months } : {}),
                ...(prod?.repayment_frequency ? { repayment_frequency: prod.repayment_frequency } : {}),
              }));
            }}
          >
            {loanProducts && loanProducts.length > 0
              ? loanProducts.map((p: any) => <option key={p.id} value={p.name}>{p.name}{p.code ? ` (${p.code})` : ""}</option>)
              : PRODUCT_TYPES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Requested Amount (KES) *"><input className={fieldCls} type="number" value={f.requested_amount} onChange={set("requested_amount")} /></Field>
        <Field label="Recommended Amount (KES)"><input className={fieldCls} type="number" value={f.recommended_amount} onChange={set("recommended_amount")} /></Field>
        <Field label="Loan Purpose" className="sm:col-span-2"><textarea className={fieldCls + " h-20 py-2"} value={f.loan_purpose} onChange={set("loan_purpose")} /></Field>
        <Field label="Loan Tenor (months)"><input className={fieldCls} type="number" value={f.tenor_months} onChange={set("tenor_months")} /></Field>
        <Field label="Interest Rate (%)"><input className={fieldCls} type="number" step="0.01" value={f.interest_rate} onChange={set("interest_rate")} /></Field>
        <Field label="Repayment Frequency">
          <select className={fieldCls} value={f.repayment_frequency} onChange={set("repayment_frequency")}>
            {REPAYMENT_FREQS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Security Offered">
          <select className={fieldCls} value={f.security_offered} onChange={set("security_offered")}>
            {SECURITY_TYPES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Equity Contribution (KES)"><input className={fieldCls} type="number" value={f.equity_contribution} onChange={set("equity_contribution")} /></Field>
      </Section>

      <Section title="3. Executive Summary">
        <Field label="Customer Background" className="sm:col-span-2"><textarea className={fieldCls + " h-20 py-2"} value={f.customer_background} onChange={set("customer_background")} /></Field>
        <Field label="Facility Purpose" className="sm:col-span-2"><textarea className={fieldCls + " h-20 py-2"} value={f.facility_purpose} onChange={set("facility_purpose")} /></Field>
        <Field label="Recommendation" className="sm:col-span-2"><textarea className={fieldCls + " h-20 py-2"} value={f.exec_recommendation} onChange={set("exec_recommendation")} /></Field>
      </Section>

      <Section title="4. Character Assessment (/20)">
        <Field label="Management Experience"><input className={fieldCls} value={f.management_experience} onChange={set("management_experience")} /></Field>
        <Field label="Industry Reputation"><input className={fieldCls} value={f.industry_reputation} onChange={set("industry_reputation")} /></Field>
        <Field label="Integrity Assessment"><input className={fieldCls} value={f.integrity_assessment} onChange={set("integrity_assessment")} /></Field>
        <Field label="CRB Status">
          <select className={fieldCls} value={f.crb_status} onChange={set("crb_status")}>
            {CRB_STATUSES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Litigation Search"><input className={fieldCls} value={f.litigation_search} onChange={set("litigation_search")} /></Field>
        <Field label="Character Score (/20)"><input type="number" min={0} max={20} className={fieldCls} value={f.character_score} onChange={set("character_score")} /></Field>
      </Section>

      <Section title="5. Capacity Analysis (/25)">
        <Field label="Revenue (KES)"><input type="number" className={fieldCls} value={f.revenue} onChange={set("revenue")} /></Field>
        <Field label="Gross Profit"><input type="number" className={fieldCls} value={f.gross_profit} onChange={set("gross_profit")} /></Field>
        <Field label="Net Profit"><input type="number" className={fieldCls} value={f.net_profit} onChange={set("net_profit")} /></Field>
        <Field label="Operating Expenses"><input type="number" className={fieldCls} value={f.operating_expenses} onChange={set("operating_expenses")} /></Field>
        <Field label="Avg Monthly Credits"><input type="number" className={fieldCls} value={f.avg_monthly_credits} onChange={set("avg_monthly_credits")} /></Field>
        <Field label="Avg Monthly Debits"><input type="number" className={fieldCls} value={f.avg_monthly_debits} onChange={set("avg_monthly_debits")} /></Field>
        <Field label="Debt Service Ratio (%)"><input type="number" step="0.01" className={fieldCls} value={f.debt_service_ratio} onChange={set("debt_service_ratio")} /></Field>
        <Field label="DSCR (x)"><input type="number" step="0.01" className={fieldCls} value={f.dscr} onChange={set("dscr")} /></Field>
        <Field label="Capacity Score (/25)"><input type="number" min={0} max={25} className={fieldCls} value={f.capacity_score} onChange={set("capacity_score")} /></Field>
      </Section>

      <Section title="6. Capital Analysis (/15)">
        <Field label="Net Worth (KES)"><input type="number" className={fieldCls} value={f.net_worth} onChange={set("net_worth")} /></Field>
        <Field label="Equity Contribution"><input type="number" className={fieldCls} value={f.capital_equity} onChange={set("capital_equity")} /></Field>
        <Field label="Assets Owned"><input className={fieldCls} value={f.assets_owned} onChange={set("assets_owned")} /></Field>
        <Field label="Working Capital Position"><input className={fieldCls} value={f.working_capital} onChange={set("working_capital")} /></Field>
        <Field label="Capital Score (/15)"><input type="number" min={0} max={15} className={fieldCls} value={f.capital_score} onChange={set("capital_score")} /></Field>
      </Section>

      <Section title="7. Collateral Analysis (/20)" description={ltv != null ? `LTV computed: ${(ltv * 100).toFixed(1)}%` : "LTV auto-derives from market value vs requested amount."}>
        <Field label="Security Type">
          <select className={fieldCls} value={f.security_type} onChange={set("security_type")}>
            {SECURITY_TYPES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Market Value (KES)"><input type="number" className={fieldCls} value={f.market_value} onChange={set("market_value")} /></Field>
        <Field label="Forced Sale Value (KES)"><input type="number" className={fieldCls} value={f.forced_sale_value} onChange={set("forced_sale_value")} /></Field>
        <Field label="Coverage % (auto)"><input className={fieldCls} value={f.coverage_pct} readOnly /></Field>
        <Field label="Collateral Score (/20)"><input type="number" min={0} max={20} className={fieldCls} value={f.collateral_score} onChange={set("collateral_score")} /></Field>
      </Section>

      <Section title="8. Conditions Analysis (/10)">
        <Field label="Market Outlook"><input className={fieldCls} value={f.market_outlook} onChange={set("market_outlook")} /></Field>
        <Field label="Competition"><input className={fieldCls} value={f.competition} onChange={set("competition")} /></Field>
        <Field label="Regulatory Environment"><input className={fieldCls} value={f.regulatory_env} onChange={set("regulatory_env")} /></Field>
        <Field label="Sector Risks"><input className={fieldCls} value={f.sector_risks} onChange={set("sector_risks")} /></Field>
        <Field label="Conditions Score (/10)"><input type="number" min={0} max={10} className={fieldCls} value={f.conditions_score} onChange={set("conditions_score")} /></Field>
      </Section>

      <Section title="9. Construction Project Analysis (/20)">
        <Field label="Project Name"><input className={fieldCls} value={f.project_name} onChange={set("project_name")} /></Field>
        <Field label="Location"><input className={fieldCls} value={f.project_location} onChange={set("project_location")} /></Field>
        <Field label="Developer"><input className={fieldCls} value={f.developer} onChange={set("developer")} /></Field>
        <Field label="Contractor"><input className={fieldCls} value={f.contractor} onChange={set("contractor")} /></Field>
        <Field label="Quantity Surveyor"><input className={fieldCls} value={f.quantity_surveyor} onChange={set("quantity_surveyor")} /></Field>
        <Field label="Architect"><input className={fieldCls} value={f.architect} onChange={set("architect")} /></Field>
        <Field label="Project Cost (KES)"><input type="number" className={fieldCls} value={f.project_cost} onChange={set("project_cost")} /></Field>
        <Field label="Amount Requested for Construction"><input type="number" className={fieldCls} value={f.construction_amount} onChange={set("construction_amount")} /></Field>
        <Field label="Construction Risk Score (/20)"><input type="number" min={0} max={20} className={fieldCls} value={f.construction_risk_score} onChange={set("construction_risk_score")} /></Field>
      </Section>

      <Section title="10. Risk Analysis">
        {(["credit_risk","market_risk","operational_risk","construction_risk","legal_risk","reputation_risk"] as const).map((k) => (
          <Field key={k} label={k.replace("_"," ").replace(/\b\w/g, (l) => l.toUpperCase())}>
            <select className={fieldCls} value={f[k]} onChange={set(k)}>
              {RISK_LEVELS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
        ))}
      </Section>

      <Section title="11. IFRS 9 Risk Classification" description={f.ecl ? `Expected Credit Loss auto-calculated: KES ${Number(f.ecl).toLocaleString()}` : "ECL = PD × LGD × EAD"}>
        <Field label="PD — Probability of Default (%)"><input type="number" step="0.01" className={fieldCls} value={f.pd} onChange={set("pd")} /></Field>
        <Field label="LGD — Loss Given Default (%)"><input type="number" step="0.01" className={fieldCls} value={f.lgd} onChange={set("lgd")} /></Field>
        <Field label="EAD — Exposure at Default (KES)"><input type="number" className={fieldCls} value={f.ead} onChange={set("ead")} /></Field>
        <Field label="Stage Classification">
          <select className={fieldCls} value={f.stage} onChange={set("stage")}>
            {STAGE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Expected Credit Loss (auto)"><input className={fieldCls} value={f.ecl} readOnly /></Field>
      </Section>

      <Section title="12. Overall Credit Scoring (auto)" description={`Total: ${totalScore} / 100 — Risk grade: ${grade.replace("_"," ").toUpperCase()}`}>
        <div className="sm:col-span-2 grid grid-cols-5 gap-2 text-xs">
          {[["Character", f.character_score, 20],["Capacity", f.capacity_score, 25],["Capital", f.capital_score, 15],["Collateral", f.collateral_score, 20],["Conditions", f.conditions_score, 10]].map(([n, v, m]: any) => (
            <div key={n} className="bg-slate-50 rounded-md p-2 text-center"><div className="font-semibold text-slate-900">{v}/{m}</div><div className="text-slate-500">{n}</div></div>
          ))}
        </div>
      </Section>

      <Section title="13. Credit Analyst Recommendation">
        <Field label="Recommendation">
          <select className={fieldCls} value={f.recommendation} onChange={set("recommendation")}>
            <option>Recommend Approval</option>
            <option>Recommend Approval with Conditions</option>
            <option>Recommend Decline</option>
            <option>Refer to Committee</option>
          </select>
        </Field>
        <Field label="Approved Amount (KES)"><input type="number" className={fieldCls} value={f.approved_amount} onChange={set("approved_amount")} /></Field>
        <Field label="Approved Tenor (months)"><input type="number" className={fieldCls} value={f.approved_tenor} onChange={set("approved_tenor")} /></Field>
        <Field label="Approved Rate (%)"><input type="number" step="0.01" className={fieldCls} value={f.approved_rate} onChange={set("approved_rate")} /></Field>
        <Field label="Security"><input className={fieldCls} value={f.approved_security} onChange={set("approved_security")} /></Field>
        <Field label="Conditions Precedent (one per line)" className="sm:col-span-2">
          <textarea className={fieldCls + " h-24 py-2"} value={f.conditions_precedent} onChange={set("conditions_precedent")} placeholder="e.g. Submit valid land title&#10;Provide insurance cover note" />
        </Field>
      </Section>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => nav({ to: "/loans" })} className="px-4 h-10 rounded-md border border-slate-200 text-sm bg-white">Cancel</button>
        <button type="submit" className="px-5 h-10 rounded-md bg-[#1E3A5F] text-white text-sm font-medium">Create loan application</button>
      </div>
    </form>
  );
}
