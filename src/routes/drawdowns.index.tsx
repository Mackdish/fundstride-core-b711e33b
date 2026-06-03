import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { ListShell, exportCsv } from "@/components/ListShell";
import { DataTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatKES, formatDate } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  requested_amount: number;
  certified_amount: number | null;
  status: string;
  created_at: string;
  milestone: { name: string; sequence: number; project: { name: string; customer: { name: string } } } | null;
  loan: { approved_amount: number; appraisal: { customer: { name: string } } } | null;
};

function DrawdownsPage() {
  const nav = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["drawdowns_full", status],
    queryFn: async () => {
      let q = supabase
        .from("drawdown_requests")
        .select(`
          id, requested_amount, certified_amount, status, created_at,
          milestone:milestones ( name, sequence, project:projects ( name, customer:customers ( name ) ) ),
          loan:loan_facilities ( approved_amount, appraisal:appraisals ( customer:customers ( name ) ) )
        `)
        .order("created_at", { ascending: false })
        .limit(200);
      if (status) q = q.eq("status", status as any);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const statusRank: Record<string, number> = { pending: 0, blocked: 1, active: 2, rejected: 3 };
  const rows = (data ?? []).slice().sort((a, b) => (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9)).filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.id.toLowerCase().includes(s) ||
      r.milestone?.project?.name?.toLowerCase().includes(s) ||
      r.milestone?.project?.customer?.name?.toLowerCase().includes(s)
    );
  });

  return (
    <>
      <PageHeader title="Drawdowns" description="Milestone-based disbursement pipeline across the loan book." />
      <ListShell
        search={search}
        setSearch={setSearch}
        filter={status}
        setFilter={setStatus}
        filters={[
          { value: "pending", label: "Pending" },
          { value: "active", label: "Approved" },
          { value: "blocked", label: "Blocked" },
          { value: "rejected", label: "Rejected" },
        ]}
        onExport={() => exportCsv("drawdowns.csv", rows.map((r) => ({
          id: r.id,
          project: r.milestone?.project?.name,
          customer: r.milestone?.project?.customer?.name,
          milestone: r.milestone?.name,
          requested: r.requested_amount,
          certified: r.certified_amount,
          status: r.status,
          created_at: r.created_at,
        })) as any)}
      >
        <DataTable
          loading={isLoading}
          rows={rows}
          onRowClick={(r) => nav({ to: "/drawdowns/$id", params: { id: r.id } })}
          empty={<EmptyState title="No drawdowns yet" message="Requests will appear here once developers submit." />}
          columns={[
            { header: "Ref", cell: (r) => <span className="font-mono text-xs text-slate-600">{r.id.slice(0, 8)}</span> },
            { header: "Project", cell: (r) => <span className="font-medium text-slate-900">{r.milestone?.project?.name ?? "—"}</span> },
            { header: "Customer", cell: (r) => r.milestone?.project?.customer?.name ?? "—" },
            { header: "Milestone", cell: (r) => r.milestone ? `${r.milestone.sequence}. ${r.milestone.name}` : "—" },
            { header: "Requested", cell: (r) => <span className="tabular-nums">{formatKES(r.requested_amount)}</span> },
            { header: "Certified", cell: (r) => <span className="tabular-nums text-slate-600">{formatKES(r.certified_amount)}</span> },
            { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
            { header: "Submitted", cell: (r) => <span className="text-slate-500">{formatDate(r.created_at)}</span> },
          ]}
        />
      </ListShell>
    </>
  );
}

export const Route = createFileRoute("/drawdowns/")({
  component: () => <ProtectedRoute><DrawdownsPage /></ProtectedRoute>,
});
