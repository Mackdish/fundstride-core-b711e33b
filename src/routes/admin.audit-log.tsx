import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/audit-log")({
  component: () => <ProtectedRoute roles={["super_admin","risk_compliance_officer"]}><AuditLog /></ProtectedRoute>,
});

function AuditLog() {
  const { data, isLoading } = useQuery({
    queryKey: ["audit-log"],
    queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500)).data ?? [],
  });
  return (
    <>
      <PageHeader title="Audit log" description="Complete trail of system actions." />
      <DataTable
        loading={isLoading}
        rows={(data ?? []) as any[]}
        columns={[
          { header: "When", cell: (r: any) => formatDate(r.created_at) },
          { header: "Action", cell: (r: any) => <span className="font-medium">{r.action}</span> },
          { header: "Entity", cell: (r: any) => `${r.entity_type}${r.entity_id ? ` · ${r.entity_id.slice(0,8)}` : ""}` },
          { header: "User", cell: (r: any) => r.user_id?.slice(0,8) ?? "—" },
        ]}
        empty={<EmptyState title="No activity yet" />}
      />
    </>
  );
}
