import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { Field, Section, fieldCls } from "@/components/form-fields";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/admin/loan-products/new")({
  component: () => (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <NewLoanProduct />
    </ProtectedRoute>
  ),
});

const FREQS = ["monthly", "quarterly", "semi-annual", "annual", "bullet"];

function NewLoanProduct() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: "", code: "", description: "",
    default_interest_rate: "", default_tenor_months: "",
    processing_fee_rate: "", insurance_fee_rate: "", max_ltv: "",
    min_amount: "", max_amount: "",
    repayment_frequency: "monthly", status: "active",
  });
  const set = (k: keyof typeof f) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: any) => {
    e.preventDefault();
    if (!f.name.trim()) return toast.error("Product name is required");
    setBusy(true);
    try {
      const num = (v: string) => (v === "" ? null : Number(v));
      const { data, error } = await supabase.from("loan_products").insert({
        name: f.name.trim(),
        code: f.code.trim() || null,
        description: f.description || null,
        default_interest_rate: num(f.default_interest_rate),
        default_tenor_months: f.default_tenor_months === "" ? null : parseInt(f.default_tenor_months, 10),
        processing_fee_rate: num(f.processing_fee_rate),
        insurance_fee_rate: num(f.insurance_fee_rate),
        max_ltv: num(f.max_ltv),
        min_amount: num(f.min_amount),
        max_amount: num(f.max_amount),
        repayment_frequency: f.repayment_frequency,
        status: f.status,
        created_by: user?.id,
      }).select("id").single();
      if (error) throw error;
      await logAudit("create", "loan_product", data!.id, null, f);
      toast.success("Loan product created");
      nav({ to: "/admin/loan-products" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create product");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-5 pb-10">
      <PageHeader title="New loan product" description="Configure default terms for a product your credit officers can pick when raising a loan." />
      <Section title="Product details">
        <Field label="Name *"><input className={fieldCls} value={f.name} onChange={set("name")} placeholder="e.g. Construction Bridging Loan" /></Field>
        <Field label="Code"><input className={fieldCls} value={f.code} onChange={set("code")} placeholder="e.g. CBL-01" /></Field>
        <Field label="Description" className="sm:col-span-2">
          <textarea className={fieldCls + " h-20 py-2"} value={f.description} onChange={set("description")} />
        </Field>
      </Section>

      <Section title="Default terms">
        <Field label="Default interest rate (%)"><input className={fieldCls} type="number" step="0.01" value={f.default_interest_rate} onChange={set("default_interest_rate")} /></Field>
        <Field label="Default tenor (months)"><input className={fieldCls} type="number" value={f.default_tenor_months} onChange={set("default_tenor_months")} /></Field>
        <Field label="Repayment frequency">
          <select className={fieldCls} value={f.repayment_frequency} onChange={set("repayment_frequency")}>
            {FREQS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Processing fee rate (e.g. 0.03 = 3%)"><input className={fieldCls} type="number" step="0.001" value={f.processing_fee_rate} onChange={set("processing_fee_rate")} /></Field>
        <Field label="Insurance fee rate"><input className={fieldCls} type="number" step="0.001" value={f.insurance_fee_rate} onChange={set("insurance_fee_rate")} /></Field>
        <Field label="Max LTV (e.g. 0.70 = 70%)"><input className={fieldCls} type="number" step="0.01" value={f.max_ltv} onChange={set("max_ltv")} /></Field>
      </Section>

      <Section title="Eligibility range">
        <Field label="Minimum amount (KES)"><input className={fieldCls} type="number" value={f.min_amount} onChange={set("min_amount")} /></Field>
        <Field label="Maximum amount (KES)"><input className={fieldCls} type="number" value={f.max_amount} onChange={set("max_amount")} /></Field>
        <Field label="Status">
          <select className={fieldCls} value={f.status} onChange={set("status")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
      </Section>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => nav({ to: "/admin/loan-products" })} className="h-10 px-4 rounded-md border border-slate-200 text-sm">Cancel</button>
        <button type="submit" disabled={busy} className="h-10 px-4 rounded-md bg-[#1E3A5F] text-white text-sm disabled:opacity-60">
          {busy ? "Saving…" : "Save product"}
        </button>
      </div>
    </form>
  );
}
