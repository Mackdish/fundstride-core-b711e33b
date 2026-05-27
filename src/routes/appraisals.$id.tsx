import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, formatDate, formatPct } from "@/lib/format";
import { logAudit } from "@/lib/audit";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { CheckCircle2, XCircle, FileCheck } from "lucide-react";

export const Route = createFileRoute("/appraisals/$id")({
  component: () => (
    <ProtectedRoute roles={["super_admin", "credit_officer", "risk_compliance_officer", "executive"]}>
      <AppraisalDetail />
    </ProtectedRoute>
  ),
});

function AppraisalDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const canDecide = hasRole("super_admin", "credit_officer");

  const { data, isLoading } = useQuery({
    queryKey: ["appraisal", id],
    queryFn: async () => {
      const [a, conds] = await Promise.all([
        supabase
          .from("appraisals")
          .select("*, customer:customers(name,sector,phone), project:projects(name,location,expected_value,units)")
          .eq("id", id)
          .single(),
        supabase.from("approval_conditions").select("*").eq("appraisal_id", id),
      ]);
      return { a: a.data as any, conds: (conds.data ?? []) as any[] };
    },
  });

  if (isLoading || !data?.a) {
    return <div className="space-y-3"><div className="h-24 bg-slate-50 animate-pulse rounded-xl" /><div className="h-64 bg-slate-50 animate-pulse rounded-xl" /></div>;
  }
  const a = data.a;

  const decide = async (status: "active" | "rejected") => {
    const { error } = await supabase.from("appraisals").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAudit(`appraisal.${status === "active" ? "approve" : "reject"}`, "appraisal", id, { status: a.status }, { status });
    toast.success(`Appraisal ${status === "active" ? "approved" : "rejected"}`);
    qc.invalidateQueries({ queryKey: ["appraisal", id] });
  };

  const score = Number(a.score ?? 0);
  const ltv = a.ltv != null ? Number(a.ltv) * 100 : null;

  return (
    <>
      <PageHeader
        title={`Appraisal — ${a.project?.name ?? "—"}`}
        description={`${a.customer?.name ?? "—"} · Submitted ${formatDate(a.created_at)}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={a.status} />
            {canDecide && a.status === "pending" && (
              <>
                <button onClick={() => decide("active")} className="h-10 px-4 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </button>
                <button onClick={() => decide("rejected")} className="h-10 px-4 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 flex items-center gap-2">
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="grid lg:grid-cols-4 gap-4 mb-4">
        <Stat label="Requested" value={formatKES(a.requested_amount)} />
        <Stat label="Recommended" value={formatKES(a.recommended_amount)} accent />
        <Stat label="LTV" value={formatPct(ltv)} />
        <Stat label="DSCR" value={a.dscr != null ? Number(a.dscr).toFixed(2) + "x" : "—"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Credit score</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold text-slate-900">{score.toFixed(0)}</span>
            <span className="text-sm text-slate-500">/ 100</span>
            <span className="ml-auto"><StatusBadge status={a.grade ?? "amber"} /></span>
          </div>
          <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-2 ${score >= 70 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, score)}%` }} />
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            {[
              ["Borrower", 18, 20],
              ["Project viability", 16, 20],
              ["Collateral", 14, 20],
              ["Cash flow / DSCR", 12, 20],
              ["Contractor risk", 8, 20],
            ].map(([k, v, max]) => (
              <div key={k as string} className="flex justify-between"><span className="text-slate-500">{k}</span><span className="font-medium">{v}/{max}</span></div>
            ))}
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Customer & project</h3>
          <Row k="Customer" v={a.customer?.name} />
          <Row k="Sector" v={a.customer?.sector} />
          <Row k="Phone" v={a.customer?.phone} />
          <div className="my-3 border-t border-slate-100" />
          <Row k="Project" v={a.project?.name} />
          <Row k="Location" v={a.project?.location} />
          <Row k="Units" v={a.project?.units} />
          <Row k="Expected value" v={formatKES(a.project?.expected_value)} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <FileCheck className="h-4 w-4" /> Approval conditions ({data.conds.length})
          </h3>
          {data.conds.length === 0 ? (
            <p className="text-sm text-slate-500">No precedent conditions logged.</p>
          ) : (
            <ul className="space-y-2">
              {data.conds.map((c) => (
                <li key={c.id} className="text-sm border-b border-slate-100 last:border-0 pb-2">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-slate-900">{c.description}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {c.condition_type ?? "—"} · {c.responsible_party ?? "—"} · due {formatDate(c.due_date)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "bg-[#1E3A5F] text-white border-[#1E3A5F]" : "bg-white border-slate-200"}`}>
      <div className={`text-xs uppercase tracking-wide ${accent ? "text-white/70" : "text-slate-500"}`}>{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: any }) {
  return <div className="text-sm flex justify-between py-0.5"><span className="text-slate-500">{k}</span><span className="text-slate-900">{v ?? "—"}</span></div>;
}
