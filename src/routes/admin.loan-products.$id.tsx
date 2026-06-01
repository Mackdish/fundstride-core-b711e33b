import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { Field, Section, fieldCls } from "@/components/form-fields";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/admin/loan-products/$id")({
  component: () => (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <EditLoanProduct />
    </ProtectedRoute>
  ),
});

const FREQS = ["monthly", "quarterly", "semi-annual", "annual", "bullet"];

function EditLoanProduct() {
  const { id } = useParams({ from: "/admin/loan-products/$id" });
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<any>(null);

  const { data } = useQuery({
    queryKey: ["loan_product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("loan_products").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data && !f) {
      const v = (x: any) => (x == null ? "" : String(x));
      setF({
        name: data.name ?? "",
        code: data.code ?? "",
        description: data.description ?? "",
        default_interest_rate: v(data.default_interest_rate),
        default_tenor_months: v(data.default_tenor_months),
        processing_fee_rate: v(data.processing_fee_rate),
        insurance_fee_rate: v(data.insurance_fee_rate),
        max_ltv: v(data.max_ltv),
        min_amount: v(data.min_amount),
        max_amount: v(data.max_amount),
        repayment_frequency: data.repayment_frequency ?? "monthly",
        status: data.status ?? "active",
      });
    }
  }, [data, f]);

  if (!f) return <div className="p-4 text-sm text-slate-500">Loading…</div>;

  const set = (k: string) => (e: any) => setF((p: any) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: any) => {
    e.preventDefault();
    setBusy(true);
    try {
      const num = (v: string) => (v === "" ? null : Number(v));
      const payload = {
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
      };
      const { error } = await supabase.from("loan_products").update(payload).eq("id", id);
      if (error) throw error;
      await logAudit("update", "loan_product", id, data, payload);
      toast.success("Saved");
      nav({ to: "/admin/loan-products" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-5 pb-10">
      <PageHeader title={`Edit · ${data?.name ?? ""}`} description="Update default terms. Existing loans referencing this product are not changed." />
      <Section title="Product details">
        <Field label="Name *"><input className={fieldCls} value={f.name} onChange={set("name")} /></Field>
        <Field label="Code"><input className={fieldCls} value={f.code} onChange={set("code")} /></Field>
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
        <Field label="Processing fee rate"><input className={fieldCls} type="number" step="0.001" value={f.processing_fee_rate} onChange={set("processing_fee_rate")} /></Field>
        <Field label="Insurance fee rate"><input className={fieldCls} type="number" step="0.001" value={f.insurance_fee_rate} onChange={set("insurance_fee_rate")} /></Field>
        <Field label="Max LTV"><input className={fieldCls} type="number" step="0.01" value={f.max_ltv} onChange={set("max_ltv")} /></Field>
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
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
