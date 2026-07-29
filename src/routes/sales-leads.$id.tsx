import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Save } from "lucide-react";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { Field, Section, fieldCls } from "@/components/form-fields";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/sales-leads/$id")({
  component: () => (
    <ProtectedRoute roles={["super_admin","executive","sales","finance","projects","credit_officer","operations_officer","finance_officer"]}>
      <LeadDetail />
    </ProtectedRoute>
  ),
});

const PRODUCTS = ["Design Works", "Construction", "Construction Financing"] as const;
const STATUSES = ["Discussion", "Pending", "Closed", "Deferred"] as const;

function LeadDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", contact: "", location: "", product: PRODUCTS[0] as string, status: STATUSES[0] as string, notes: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["sales_lead", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("sales_leads").select("*").eq("id", id).single();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (data) setF({
      name: data.name ?? "", contact: data.contact ?? "", location: data.location ?? "",
      product: data.product ?? PRODUCTS[0], status: data.status ?? STATUSES[0], notes: data.notes ?? "",
    });
  }, [data]);

  const set = (k: keyof typeof f) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sales_leads").update(f).eq("id", id);
      if (error) throw error;
      await logAudit("update", "sales_lead", id, data, f);
    },
    onSuccess: () => { toast.success("Lead updated"); qc.invalidateQueries({ queryKey: ["sales_lead", id] }); qc.invalidateQueries({ queryKey: ["sales_leads"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sales_leads").delete().eq("id", id);
      if (error) throw error;
      await logAudit("delete", "sales_lead", id, data, null);
    },
    onSuccess: () => { toast.success("Lead deleted"); nav({ to: "/sales-leads" }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });

  if (isLoading || !data) return <div className="h-64 bg-slate-50 animate-pulse rounded-xl" />;

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title={data.name}
        description={`Sales lead · Created ${formatDate(data.created_at)}`}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/sales-leads" className="h-9 px-3 rounded-md border border-slate-200 text-sm inline-flex items-center gap-1.5 hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <button onClick={() => save.mutate()} disabled={save.isPending} className="h-9 px-3 rounded-md bg-[#1E3A5F] text-white text-sm inline-flex items-center gap-1.5 disabled:opacity-60">
              <Save className="h-4 w-4" /> {save.isPending ? "Saving…" : "Save changes"}
            </button>
            <button onClick={() => { if (confirm(`Delete lead "${data.name}"?`)) del.mutate(); }} className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-red-50 text-red-600 border border-slate-200" title="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        }
      />

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
          <textarea className={fieldCls + " h-32 py-2"} value={f.notes} onChange={set("notes")} />
        </Field>
      </Section>
    </div>
  );
}
