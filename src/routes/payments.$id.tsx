import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, formatDate } from "@/lib/format";
import { logAudit } from "@/lib/audit";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";

export const Route = createFileRoute("/payments/$id")({
  component: () => (
    <ProtectedRoute roles={["super_admin", "finance_officer"]}><PaymentDetail /></ProtectedRoute>
  ),
});

function PaymentDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { user, hasRole } = useAuth();
  const canAuth = hasRole("super_admin", "finance_officer");

  const { data, isLoading } = useQuery({
    queryKey: ["payment", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*, beneficiary:beneficiaries(*), drawdown:drawdown_requests(id, certified_amount, loan_id)")
        .eq("id", id)
        .single();
      return data as any;
    },
  });

  if (isLoading || !data) return <div className="h-64 bg-slate-50 animate-pulse rounded-xl" />;
  const p = data;
  const b = p.beneficiary;

  const setStatus = async (status: string, extra: Record<string, any> = {}) => {
    const { error } = await supabase.from("payments").update({ status, ...extra }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAudit(`payment.${status}`, "payment", id, { status: p.status }, { status });
    toast.success("Payment " + status);
    qc.invalidateQueries({ queryKey: ["payment", id] });
  };

  const authorize = () => {
    if (user?.id === p.created_by) { toast.error("Maker cannot be checker"); return; }
    setStatus("active", { authorized_by: user!.id });
  };

  return (
    <>
      <PageHeader title={`Payment · ${formatKES(p.amount)}`} description={p.purpose ?? "—"} actions={
        <div className="flex items-center gap-2">
          <Link to="/payments/$id/receipt" params={{ id }} className="h-9 px-3 rounded-md border border-slate-200 text-sm hover:bg-slate-50">Receipt</Link>
          <StatusBadge status={p.status} />
        </div>
      } />

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Beneficiary</h3>
          {b ? (
            <>
              <div className="text-base font-medium">{b.name}</div>
              <div className="mt-2 text-sm space-y-1">
                <Row k="Bank" v={b.bank_name} />
                <Row k="Account" v={b.account_number} />
                <Row k="Mobile" v={b.mobile_wallet} />
                <Row k="Verification" v={<StatusBadge status={b.verification_status} />} />
              </div>
            </>
          ) : <div className="text-sm text-slate-500">No beneficiary linked.</div>}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Dual authorization</h3>
          <ul className="space-y-3">
            <Step done label="Created (Maker)" sub={p.created_by ? "Logged" : "—"} />
            <Step done={!!p.authorized_by} label="Authorized (Checker)" sub={p.authorized_by ? "Approved" : "Awaiting checker"} />
            <Step done={p.status === "completed"} label="Released to beneficiary" sub={p.status === "completed" ? "Funds dispatched" : "Pending"} />
          </ul>
          {canAuth && p.status === "pending" && (
            <div className="mt-4 flex gap-2">
              <button onClick={authorize} className="h-9 px-3 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Authorize
              </button>
              <button onClick={() => setStatus("rejected")} className="h-9 px-3 rounded-md border border-slate-200 text-sm font-medium hover:bg-slate-50 flex items-center gap-1.5">
                <XCircle className="h-4 w-4" /> Reject
              </button>
            </div>
          )}
          {canAuth && p.status === "active" && (
            <button onClick={() => setStatus("completed")} className="mt-4 h-9 px-3 rounded-md bg-[#1E3A5F] text-white text-sm font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Mark released
            </button>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Reconciliation</h3>
          <div className="text-sm space-y-1">
            <Row k="Created" v={formatDate(p.created_at)} />
            <Row k="Drawdown" v={p.drawdown ? formatKES(p.drawdown.certified_amount) : "—"} />
            <Row k="Amount" v={<span className="font-semibold">{formatKES(p.amount)}</span>} />
            <Row k="Status" v={<StatusBadge status={p.status} />} />
          </div>
        </div>
      </div>
    </>
  );
}

function Step({ done, label, sub }: { done: boolean; label: string; sub: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>✓</span>
      <div><div className="text-sm font-medium text-slate-900">{label}</div><div className="text-xs text-slate-500">{sub}</div></div>
    </li>
  );
}
function Row({ k, v }: { k: string; v: any }) {
  return <div className="flex justify-between gap-2"><span className="text-slate-500">{k}</span><span className="text-slate-900">{v ?? "—"}</span></div>;
}
