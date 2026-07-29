import { useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { formatKES, formatDate, formatPct } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { CheckCircle2, Circle, XCircle, AlertTriangle, ArrowLeft, Banknote, FileCheck, Hammer, Shield, Wallet, Send } from "lucide-react";

type Detail = {
  id: string;
  requested_amount: number;
  certified_amount: number | null;
  status: string;
  created_at: string;
  milestone: {
    id: string;
    name: string;
    sequence: number;
    target_pct: number;
    eligible_amount: number;
    project: { id: string; name: string; location: string | null; customer: { id: string; name: string } };
  } | null;
  loan: {
    id: string;
    approved_amount: number;
    interest_rate: number;
    tenor_months: number;
    status: string;
    appraisal: { ltv: number | null; dscr: number | null; grade: string | null };
  } | null;
};

type Payment = {
  id: string;
  amount: number;
  purpose: string | null;
  status: string;
  beneficiary: { name: string; bank_name: string | null } | null;
};

type Beneficiary = { id: string; name: string; bank_name: string | null; verification_status: string };

const STAGES = [
  { key: "submitted", label: "Submitted", icon: Send, desc: "Developer submitted request" },
  { key: "site", label: "Site Inspection", icon: Hammer, desc: "Site visit & progress verified" },
  { key: "qs", label: "QS Certification", icon: FileCheck, desc: "Quantity surveyor certified amount" },
  { key: "risk", label: "Risk Review", icon: Shield, desc: "Covenants & exposure reviewed" },
  { key: "finance", label: "Finance Approval", icon: Wallet, desc: "Finance officer authorised release" },
  { key: "released", label: "Released", icon: Banknote, desc: "Funds disbursed to beneficiaries" },
];

function stageIndex(status: string, certified: number | null, paymentsCount: number) {
  if (status === "rejected") return -1;
  if (status === "blocked") return 1;
  if (status === "pending") return certified ? 3 : 1;
  if (status === "active") return paymentsCount > 0 ? 6 : 5;
  return 0;
}

function DrawdownDetail() {
  const { id } = useParams({ from: "/drawdowns/$id" });
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user, isStaff, hasRole } = useAuth();
  const canApproveDrawdown = hasRole("super_admin", "executive");
  const [certifyOpen, setCertifyOpen] = useState(false);
  const [certAmount, setCertAmount] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ beneficiary_id: "", amount: "", purpose: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["drawdown", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drawdown_requests")
        .select(`
          id, requested_amount, certified_amount, status, created_at,
          milestone:milestones ( id, name, sequence, target_pct, eligible_amount,
            project:projects ( id, name, location, customer:customers ( id, name ) ) ),
          loan:loan_facilities ( id, approved_amount, interest_rate, tenor_months, status,
            appraisal:appraisals ( ltv, dscr, grade ) )
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as Detail;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["drawdown_payments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, purpose, status, beneficiary:beneficiaries ( name, bank_name )")
        .eq("drawdown_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Payment[];
    },
  });

  const { data: beneficiaries } = useQuery({
    queryKey: ["beneficiaries_picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiaries")
        .select("id, name, bank_name, verification_status")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Beneficiary[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (vars: { status: string; certified_amount?: number }) => {
      const patch: any = { status: vars.status };
      if (vars.certified_amount !== undefined) patch.certified_amount = vars.certified_amount;
      const { error } = await supabase.from("drawdown_requests").update(patch).eq("id", id);
      if (error) throw error;
      await logAudit(vars.status, "drawdown_request", id, null, patch);
    },
    onSuccess: (_d, vars) => {
      toast.success(`Drawdown ${vars.status === "active" ? "approved" : vars.status}`);
      qc.invalidateQueries({ queryKey: ["drawdown", id] });
      qc.invalidateQueries({ queryKey: ["drawdowns_full"] });
      setCertifyOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createPayment = useMutation({
    mutationFn: async () => {
      const amount = Number(payForm.amount);
      if (!payForm.beneficiary_id || !amount) throw new Error("Beneficiary and amount required");
      const { error } = await supabase.from("payments").insert({
        drawdown_id: id,
        beneficiary_id: payForm.beneficiary_id,
        amount,
        purpose: payForm.purpose || null,
        status: "pending",
        created_by: user?.id,
      });
      if (error) throw error;
      await logAudit("create_payment", "payment", id, null, payForm);
    },
    onSuccess: () => {
      toast.success("Payment instruction created");
      qc.invalidateQueries({ queryKey: ["drawdown_payments", id] });
      setPayOpen(false);
      setPayForm({ beneficiary_id: "", amount: "", purpose: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-1/3 bg-slate-100 rounded animate-pulse" />
        <div className="h-32 bg-slate-100 rounded animate-pulse" />
        <div className="h-64 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  const m = data.milestone;
  const l = data.loan;
  const paid = (payments ?? []).reduce((s, p) => s + Number(p.amount || 0), 0);
  const remaining = (data.certified_amount ?? data.requested_amount) - paid;
  const stage = stageIndex(data.status, data.certified_amount, payments?.length ?? 0);

  return (
    <div className="space-y-6">
      <button onClick={() => nav({ to: "/drawdowns" })} className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Back to drawdowns
      </button>

      <PageHeader
        title={`Drawdown ${data.id.slice(0, 8).toUpperCase()}`}
        description={m ? `${m.project.name} — Milestone ${m.sequence}: ${m.name}` : "—"}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={data.status} />
          </div>
        }
      />

      {/* Approval pipeline */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-5">Approval Pipeline</h3>
        <div className="relative">
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-slate-200" />
          <div
            className="absolute top-5 left-5 h-0.5 bg-[#1E3A5F] transition-all"
            style={{ width: `calc((100% - 40px) * ${Math.max(0, Math.min(stage, STAGES.length - 1)) / (STAGES.length - 1)})` }}
          />
          <div className="relative grid grid-cols-6 gap-2">
            {STAGES.map((s, i) => {
              const done = stage > i;
              const current = stage === i;
              const failed = data.status === "rejected" && i === 1;
              const blocked = data.status === "blocked" && i === 1;
              const Icon = failed ? XCircle : blocked ? AlertTriangle : done ? CheckCircle2 : current ? CheckCircle2 : Circle;
              const color = failed
                ? "text-red-600 bg-red-50 ring-red-200"
                : blocked
                ? "text-amber-700 bg-amber-50 ring-amber-200"
                : done || current
                ? "text-white bg-[#1E3A5F] ring-[#1E3A5F]"
                : "text-slate-400 bg-white ring-slate-200";
              return (
                <div key={s.key} className="flex flex-col items-center text-center">
                  <div className={`relative z-10 h-10 w-10 rounded-full ring-2 flex items-center justify-center ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-2 text-xs font-medium text-slate-900">{s.label}</div>
                  <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{s.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Summary */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Request summary</h3>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">Requested</dt>
                <dd className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">{formatKES(data.requested_amount)}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">Certified</dt>
                <dd className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">{formatKES(data.certified_amount)}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">Paid out</dt>
                <dd className="mt-1 text-lg font-semibold text-emerald-700 tabular-nums">{formatKES(paid)}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">Remaining</dt>
                <dd className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">{formatKES(Math.max(0, remaining))}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">Milestone target</dt>
                <dd className="mt-1 text-slate-700">{m ? formatPct(m.target_pct) : "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">Milestone eligible</dt>
                <dd className="mt-1 text-slate-700 tabular-nums">{formatKES(m?.eligible_amount)}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">Submitted</dt>
                <dd className="mt-1 text-slate-700">{formatDate(data.created_at)}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs uppercase tracking-wide">Location</dt>
                <dd className="mt-1 text-slate-700">{m?.project.location ?? "—"}</dd>
              </div>
            </dl>
          </div>

          {/* Payments */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between p-6 pb-4">
              <h3 className="text-sm font-semibold text-slate-900">Disbursement instructions</h3>
              {isStaff && data.status === "active" && (
                <button
                  onClick={() => setPayOpen(true)}
                  className="h-9 px-3 rounded-md bg-[#1E3A5F] text-white text-xs font-medium hover:bg-[#2D5F8A]"
                >
                  + New payment
                </button>
              )}
            </div>
            {(payments?.length ?? 0) === 0 ? (
              <div className="px-6 pb-6">
                <EmptyState title="No payments yet" message="Once approved, finance can release funds to beneficiaries." />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-y border-slate-200">
                  <tr className="text-left text-slate-600">
                    <th className="px-6 py-2 font-medium">Beneficiary</th>
                    <th className="px-6 py-2 font-medium">Purpose</th>
                    <th className="px-6 py-2 font-medium text-right">Amount</th>
                    <th className="px-6 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments!.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-6 py-3">
                        <div className="font-medium text-slate-900">{p.beneficiary?.name ?? "—"}</div>
                        <div className="text-xs text-slate-500">{p.beneficiary?.bank_name ?? ""}</div>
                      </td>
                      <td className="px-6 py-3 text-slate-700">{p.purpose ?? "—"}</td>
                      <td className="px-6 py-3 text-right tabular-nums font-medium text-slate-900">{formatKES(p.amount)}</td>
                      <td className="px-6 py-3"><StatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Loan facility</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Approved</dt><dd className="font-medium tabular-nums">{formatKES(l?.approved_amount)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Rate</dt><dd className="font-medium">{l ? formatPct(l.interest_rate) : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Tenor</dt><dd className="font-medium">{l?.tenor_months ?? "—"} months</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">LTV</dt><dd className="font-medium">{formatPct(l?.appraisal?.ltv)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">DSCR</dt><dd className="font-medium">{l?.appraisal?.dscr?.toFixed(2) ?? "—"}x</dd></div>
              <div className="flex justify-between items-center"><dt className="text-slate-500">Risk grade</dt><dd><StatusBadge status={l?.appraisal?.grade ?? "draft"} /></dd></div>
            </dl>
            {m && (
              <Link
                to="/projects/$id"
                params={{ id: m.project.id }}
                className="mt-4 block text-center text-xs text-[#1E3A5F] hover:underline"
              >
                View project →
              </Link>
            )}
          </div>

          {/* Actions */}
          {canApproveDrawdown && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Actions</h3>
              <div className="space-y-2">
                {data.status === "pending" && (
                  <>
                    <button
                      onClick={() => { setCertAmount(String(data.requested_amount)); setCertifyOpen(true); }}
                      className="w-full h-9 rounded-md bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2D5F8A]"
                    >
                      Certify & approve
                    </button>
                    <button
                      onClick={() => updateStatus.mutate({ status: "blocked" })}
                      className="w-full h-9 rounded-md bg-amber-50 text-amber-800 ring-1 ring-amber-200 text-sm font-medium hover:bg-amber-100"
                    >
                      Block (site issue)
                    </button>
                    <button
                      onClick={() => updateStatus.mutate({ status: "rejected" })}
                      className="w-full h-9 rounded-md bg-red-50 text-red-700 ring-1 ring-red-200 text-sm font-medium hover:bg-red-100"
                    >
                      Reject
                    </button>
                  </>
                )}
                {data.status === "blocked" && (
                  <button
                    onClick={() => updateStatus.mutate({ status: "pending" })}
                    className="w-full h-9 rounded-md bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2D5F8A]"
                  >
                    Unblock & resubmit
                  </button>
                )}
                {data.status === "active" && (
                  <p className="text-xs text-slate-500">Drawdown approved. Release funds via "New payment".</p>
                )}
                {data.status === "rejected" && (
                  <p className="text-xs text-slate-500">This request has been rejected.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Certify modal */}
      {certifyOpen && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4" onClick={() => setCertifyOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Certify drawdown</h3>
            <p className="text-sm text-slate-500 mb-4">Enter the QS-certified amount. This becomes the disbursable cap.</p>
            <label className="text-xs font-medium text-slate-700">Certified amount (KES)</label>
            <input
              type="number"
              value={certAmount}
              onChange={(e) => setCertAmount(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-slate-300 text-sm"
            />
            <div className="text-xs text-slate-500 mt-1">Requested: {formatKES(data.requested_amount)} • Milestone eligible: {formatKES(m?.eligible_amount)}</div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setCertifyOpen(false)} className="h-9 px-3 rounded-md text-sm text-slate-700 hover:bg-slate-100">Cancel</button>
              <button
                disabled={updateStatus.isPending || !Number(certAmount)}
                onClick={() => updateStatus.mutate({ status: "active", certified_amount: Number(certAmount) })}
                className="h-9 px-4 rounded-md bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2D5F8A] disabled:opacity-50"
              >
                {updateStatus.isPending ? "Saving…" : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {payOpen && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4" onClick={() => setPayOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">New payment instruction</h3>
            <p className="text-sm text-slate-500 mb-4">Remaining available: {formatKES(Math.max(0, remaining))}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Beneficiary</label>
                <select
                  value={payForm.beneficiary_id}
                  onChange={(e) => setPayForm({ ...payForm, beneficiary_id: e.target.value })}
                  className="mt-1 w-full h-10 px-3 rounded-md border border-slate-300 text-sm bg-white"
                >
                  <option value="">Select beneficiary…</option>
                  {beneficiaries?.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} {b.bank_name ? `(${b.bank_name})` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Amount (KES)</label>
                <input
                  type="number"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  className="mt-1 w-full h-10 px-3 rounded-md border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Purpose</label>
                <input
                  value={payForm.purpose}
                  onChange={(e) => setPayForm({ ...payForm, purpose: e.target.value })}
                  placeholder="e.g. Cement supply for substructure"
                  className="mt-1 w-full h-10 px-3 rounded-md border border-slate-300 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setPayOpen(false)} className="h-9 px-3 rounded-md text-sm text-slate-700 hover:bg-slate-100">Cancel</button>
              <button
                disabled={createPayment.isPending}
                onClick={() => createPayment.mutate()}
                className="h-9 px-4 rounded-md bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2D5F8A] disabled:opacity-50"
              >
                {createPayment.isPending ? "Creating…" : "Create payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/drawdowns/$id")({
  component: () => <ProtectedRoute><DrawdownDetail /></ProtectedRoute>,
});
