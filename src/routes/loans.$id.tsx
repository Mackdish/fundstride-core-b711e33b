import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable, Column } from "@/components/DataTable";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, formatDate, formatPct } from "@/lib/format";
import { logAudit } from "@/lib/audit";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Power } from "lucide-react";

export const Route = createFileRoute("/loans/$id")({
  component: () => (
    <ProtectedRoute roles={["super_admin", "credit_officer", "finance_officer", "executive"]}>
      <LoanDetail />
    </ProtectedRoute>
  ),
});

function LoanDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const canActivate = hasRole("super_admin", "finance_officer");
  const [tab, setTab] = useState<"schedule" | "covenants" | "drawdowns" | "ledger">("schedule");

  const { data, isLoading } = useQuery({
    queryKey: ["loan", id],
    queryFn: async () => {
      const [l, sched, cov, dd, led] = await Promise.all([
        supabase.from("loan_facilities").select("*, appraisal:appraisals(customer:customers(name), project:projects(name,location))").eq("id", id).single(),
        supabase.from("repayment_schedules").select("*").eq("loan_id", id).order("instalment_date"),
        supabase.from("covenants").select("*").eq("loan_id", id),
        supabase.from("drawdown_requests").select("*").eq("loan_id", id).order("created_at", { ascending: false }),
        supabase.from("ledger_entries").select("*").eq("loan_id", id).order("created_at", { ascending: false }).limit(50),
      ]);
      return { l: l.data as any, sched: sched.data ?? [], cov: cov.data ?? [], dd: dd.data ?? [], led: led.data ?? [] };
    },
  });

  if (isLoading || !data?.l) return <div className="h-64 bg-slate-50 animate-pulse rounded-xl" />;
  const l = data.l;

  const activate = async () => {
    const { error } = await supabase.from("loan_facilities").update({ status: "active", activated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await logAudit("loan.activate", "loan_facility", id, { status: l.status }, { status: "active" });
    toast.success("Facility activated");
    qc.invalidateQueries({ queryKey: ["loan", id] });
  };

  const disbursed = (data.dd as any[]).filter((d) => d.status === "completed" || d.status === "active").reduce((s, d) => s + Number(d.certified_amount ?? 0), 0);
  const paidBack = (data.sched as any[]).filter((s) => s.status === "paid").reduce((sum, s) => sum + Number(s.principal ?? 0), 0);
  const outstanding = disbursed - paidBack;
  const utilization = l.approved_amount ? (disbursed / Number(l.approved_amount)) * 100 : 0;

  const schedCols: Column<any>[] = [
    { header: "Due", cell: (r) => formatDate(r.instalment_date) },
    { header: "Principal", cell: (r) => formatKES(r.principal) },
    { header: "Interest", cell: (r) => formatKES(r.interest) },
    { header: "Total", cell: (r) => <span className="font-medium">{formatKES(r.total)}</span> },
    { header: "Balance", cell: (r) => formatKES(r.balance) },
    { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];
  const ddCols: Column<any>[] = [
    { header: "Created", cell: (r) => formatDate(r.created_at) },
    { header: "Requested", cell: (r) => formatKES(r.requested_amount) },
    { header: "Certified", cell: (r) => formatKES(r.certified_amount) },
    { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];
  const ledCols: Column<any>[] = [
    { header: "Date", cell: (r) => formatDate(r.created_at) },
    { header: "Type", cell: (r) => r.transaction_type },
    { header: "Ref", cell: (r) => r.reference ?? "—" },
    { header: "Debit", cell: (r) => formatKES(r.debit) },
    { header: "Credit", cell: (r) => formatKES(r.credit) },
    { header: "Balance", cell: (r) => formatKES(r.balance) },
  ];

  return (
    <>
      <PageHeader
        title={`Facility · ${l.appraisal?.project?.name ?? "—"}`}
        description={`${l.appraisal?.customer?.name ?? "—"} · ${l.appraisal?.project?.location ?? "—"}`}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/loans/$id/statement" params={{ id }} className="h-10 px-3 rounded-md border border-slate-200 text-sm hover:bg-slate-50">Loan statement</Link>
            <Link to="/loans/$id/repayment-schedule" params={{ id }} className="h-10 px-3 rounded-md border border-slate-200 text-sm hover:bg-slate-50">Repayment schedule</Link>
            <StatusBadge status={l.status} />
            {canActivate && l.status === "draft" && (
              <button onClick={activate} className="h-10 px-4 rounded-md bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2D5F8A] flex items-center gap-2">
                <Power className="h-4 w-4" /> Activate
              </button>
            )}
          </div>
        }
      />

      <div className="grid lg:grid-cols-4 gap-4 mb-4">
        <Stat label="Approved" value={formatKES(l.approved_amount)} />
        <Stat label="Disbursed" value={formatKES(disbursed)} sub={formatPct(utilization) + " utilised"} />
        <Stat label="Outstanding" value={formatKES(outstanding)} accent />
        <Stat label="Rate · Tenor" value={`${formatPct(l.interest_rate)} · ${l.tenor_months}m`} sub={l.repayment_frequency} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 mb-4">
        <h3 className="font-semibold text-slate-900 mb-3">Terms</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <Row k="Processing fee" v={formatKES(l.processing_fee)} />
          <Row k="Insurance" v={formatKES(l.insurance)} />
          <Row k="Activated" v={formatDate(l.activated_at)} />
          <Row k="Frequency" v={l.repayment_frequency} />
        </div>
      </div>

      <div className="border-b border-slate-200 flex gap-1 mb-4">
        {(["schedule", "drawdowns", "covenants", "ledger"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px ${tab === t ? "border-[#1E3A5F] text-[#1E3A5F]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {t} {t === "schedule" ? `(${data.sched.length})` : t === "drawdowns" ? `(${data.dd.length})` : t === "covenants" ? `(${data.cov.length})` : `(${data.led.length})`}
          </button>
        ))}
      </div>

      {tab === "schedule" && <DataTable columns={schedCols} rows={data.sched as any[]} empty={<div className="text-sm text-slate-500 p-6">Schedule will populate on activation.</div>} />}
      {tab === "drawdowns" && <DataTable columns={ddCols} rows={data.dd as any[]} empty={<div className="text-sm text-slate-500 p-6">No drawdowns yet.</div>} />}
      {tab === "covenants" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          {data.cov.length === 0 ? <div className="text-sm text-slate-500">No covenants attached.</div> :
            (data.cov as any[]).map((c) => (
              <div key={c.id} className="py-3 border-b border-slate-100 last:border-0">
                <div className="flex justify-between"><span className="font-medium">{c.condition}</span><StatusBadge status={c.status} /></div>
                <div className="text-xs text-slate-500 mt-1">Threshold {c.threshold ?? "—"} · monitored {c.monitoring_frequency ?? "—"}</div>
              </div>
            ))}
        </div>
      )}
      {tab === "ledger" && <DataTable columns={ledCols} rows={data.led as any[]} empty={<div className="text-sm text-slate-500 p-6">No ledger entries.</div>} />}
    </>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "bg-[#1E3A5F] text-white border-[#1E3A5F]" : "bg-white border-slate-200"}`}>
      <div className={`text-xs uppercase tracking-wide ${accent ? "text-white/70" : "text-slate-500"}`}>{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {sub && <div className={`text-xs mt-0.5 ${accent ? "text-white/70" : "text-slate-500"}`}>{sub}</div>}
    </div>
  );
}
function Row({ k, v }: { k: string; v: any }) {
  return <div className="flex justify-between"><span className="text-slate-500">{k}</span><span className="text-slate-900 font-medium">{v ?? "—"}</span></div>;
}
