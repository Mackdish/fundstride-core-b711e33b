import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { ListShell, exportCsv } from "@/components/ListShell";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/documents")({
  component: () => <ProtectedRoute><Docs /></ProtectedRoute>,
});

type Doc = { id: string; scope: string; entity: string; doc_type: string; version: number; status: string; expiry_date: string | null; created_at: string; file_url: string };

function Docs() {
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["documents-all"],
    queryFn: async () => {
      const [cd, pd] = await Promise.all([
        supabase.from("customer_documents").select("*, customer:customers(name)").order("created_at", { ascending: false }).limit(200),
        supabase.from("project_documents").select("*, project:projects(name)").order("created_at", { ascending: false }).limit(200),
      ]);
      const rows: Doc[] = [
        ...(cd.data ?? []).map((d: any) => ({ id: d.id, scope: "customer", entity: d.customer?.name ?? "—", doc_type: d.doc_type, version: d.version, status: d.status, expiry_date: d.expiry_date ?? null, created_at: d.created_at, file_url: d.file_url })),
        ...(pd.data ?? []).map((d: any) => ({ id: d.id, scope: "project", entity: d.project?.name ?? "—", doc_type: d.doc_type, version: d.version, status: d.status, expiry_date: null, created_at: d.created_at, file_url: d.file_url })),
      ];
      return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
  });

  const filtered = useMemo(() => (data ?? []).filter((d) =>
    (!scope || d.scope === scope) &&
    (!search || d.doc_type.toLowerCase().includes(search.toLowerCase()) || d.entity.toLowerCase().includes(search.toLowerCase()))
  ), [data, search, scope]);

  const expiringSoon = (data ?? []).filter((d) => d.expiry_date && new Date(d.expiry_date).getTime() - Date.now() < 30 * 86400_000).length;

  const cols: Column<Doc>[] = [
    { header: "Type", cell: (r) => <span className="font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-slate-400" />{r.doc_type}</span> },
    { header: "Scope", cell: (r) => <span className="capitalize text-slate-600">{r.scope}</span> },
    { header: "Linked to", cell: (r) => r.entity },
    { header: "Version", cell: (r) => `v${r.version}` },
    { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { header: "Expiry", cell: (r) => formatDate(r.expiry_date) },
    { header: "Uploaded", cell: (r) => formatDate(r.created_at) },
  ];

  return (
    <>
      <PageHeader title="Document repository" description="Central register of customer & project documents with versioning and expiry tracking." />
      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <Stat label="Total documents" value={(data ?? []).length.toString()} />
        <Stat label="Pending review" value={(data ?? []).filter((d) => d.status === "pending").length.toString()} />
        <Stat label="Expiring in 30 days" value={expiringSoon.toString()} accent={expiringSoon > 0} />
      </div>
      <ListShell
        search={search} setSearch={setSearch}
        filter={scope} setFilter={setScope}
        filters={[{ value: "customer", label: "Customer" }, { value: "project", label: "Project" }]}
        onExport={() => exportCsv("documents.csv", filtered as any)}
      >
        <DataTable columns={cols} rows={filtered} loading={isLoading} empty={<div className="text-sm text-slate-500 p-6">No documents found.</div>} />
      </ListShell>
    </>
  );
}
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent ? "text-amber-800" : "text-slate-900"}`}>{value}</div>
    </div>
  );
}
