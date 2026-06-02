import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2, Power } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/admin/loan-products/")({
  component: () => (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <LoanProductsAdmin />
    </ProtectedRoute>
  ),
});

function LoanProductsAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["loan_products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loan_products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggle = async (id: string, current: string) => {
    const next = current === "active" ? "inactive" : "active";
    const { error } = await supabase.from("loan_products").update({ status: next }).eq("id", id);
    if (error) return toast.error(error.message);
    await logAudit("update", "loan_product", id, { status: current }, { status: next });
    toast.success(`Product ${next}`);
    qc.invalidateQueries({ queryKey: ["loan_products"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this loan product? Existing loans referencing it will not be affected.")) return;
    const { error } = await supabase.from("loan_products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await logAudit("delete", "loan_product", id);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["loan_products"] });
  };

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Loan Products"
        description="Define the loan products your company offers. Only your company can see and use these."
        actions={
          <Link to="/admin/loan-products/new" className="h-9 px-3 rounded-md bg-[#1E3A5F] text-white text-sm inline-flex items-center">
            + New product
          </Link>
        }
      />

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Rate</th>
              <th className="px-4 py-2">Tenor (m)</th>
              <th className="px-4 py-2">Max LTV</th>
              <th className="px-4 py-2">Range (KES)</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={9}>Loading…</td></tr>
            )}
            {!isLoading && (data ?? []).length === 0 && (
              <tr><td className="px-4 py-6 text-slate-500" colSpan={9}>No products yet. Create one to start.</td></tr>
            )}
            {(data ?? []).map((p: any) => (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-900">{p.name}</td>
                <td className="px-4 py-2 text-slate-600">{p.code ?? "—"}</td>
                <td className="px-4 py-2">{p.default_interest_rate != null ? `${p.default_interest_rate}%` : "—"}</td>
                <td className="px-4 py-2">{p.default_tenor_months ?? "—"}</td>
                <td className="px-4 py-2">{p.max_ltv != null ? `${(p.max_ltv * 100).toFixed(0)}%` : "—"}</td>
                <td className="px-4 py-2 text-slate-600">
                  {p.min_amount || p.max_amount
                    ? `${p.min_amount ? Number(p.min_amount).toLocaleString() : "0"} – ${p.max_amount ? Number(p.max_amount).toLocaleString() : "∞"}`
                    : "—"}
                </td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${p.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-slate-500">{formatDate(p.created_at)}</td>
                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    <Link to="/admin/loan-products/$id" params={{ id: p.id }} className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-100" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button onClick={() => toggle(p.id, p.status)} className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-100" title="Toggle status">
                      <Power className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(p.id)} className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
