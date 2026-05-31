import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { Field, Section, fieldCls } from "@/components/form-fields";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/sales-leads/new")({
  component: () => (
    <ProtectedRoute roles={["super_admin","credit_officer","operations_officer","executive"]}>
      <NewLead />
    </ProtectedRoute>
  ),
});

const PRODUCTS = ["Design Works", "Construction", "Construction Financing"] as const;
const STATUSES = ["Discussion", "Pending", "Closed", "Deferred"] as const;

function NewLead() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [f, setF] = useState({ name: "", contact: "", location: "", product: PRODUCTS[0] as string, status: STATUSES[0] as string, notes: "" });
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof f) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: any) => {
    e.preventDefault();
    if (!f.name.trim()) return toast.error("Lead name is required");
    setBusy(true);
    try {
      const { data, error } = await supabase.from("sales_leads").insert({ ...f, created_by: user?.id }).select("id").single();
      if (error) throw error;
      await logAudit("create", "sales_lead", data.id, null, f);
      toast.success("Lead added");
      nav({ to: "/sales-leads" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-5 pb-10">
      <PageHeader title="New sales lead" description="Capture a new pipeline opportunity." />
      <Section title="Lead details">
        <Field label="Name *"><input className={fieldCls} value={f.name} onChange={set("name")} /></Field>
        <Field label="Contact (phone or email)"><input className={fieldCls} value={f.contact} onChange={set("contact")} /></Field>
        <Field label="Location"><input className={fieldCls} value={f.location} onChange={set("location")} /></Field>
        <Field label="Product *">
          <select className={fieldCls} value={f.product} onChange={set("product")}>
            {PRODUCTS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Status *">
          <select className={fieldCls} value={f.status} onChange={set("status")}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <textarea className={fieldCls + " h-24 py-2"} value={f.notes} onChange={set("notes")} />
        </Field>
      </Section>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => nav({ to: "/sales-leads" })} className="h-10 px-4 rounded-md border border-slate-200 text-sm">Cancel</button>
        <button type="submit" disabled={busy} className="h-10 px-4 rounded-md bg-[#1E3A5F] text-white text-sm disabled:opacity-60">
          {busy ? "Saving…" : "Save lead"}
        </button>
      </div>
    </form>
  );
}
