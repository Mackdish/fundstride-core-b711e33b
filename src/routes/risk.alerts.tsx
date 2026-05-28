import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GenericListPage } from "@/components/GenericListPage";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/risk/alerts")({
  component: () => (
    <ProtectedRoute roles={["super_admin","risk_compliance_officer","executive"]}>
      <GenericListPage config={{
        title: "Risk alerts", description: "Alert tracker and mitigation register.",
        table: "risk_alerts", searchFields: ["trigger_event","entity_type"], deletable: true,
        statusOptions: [{ value: "open", label: "Open" }, { value: "closed", label: "Closed" }],
        columns: [
          { header: "Trigger", cell: (r: any) => <span className="font-medium">{r.trigger_event}</span> },
          { header: "Severity", cell: (r: any) => <StatusBadge status={r.severity} /> },
          { header: "Entity", cell: (r: any) => r.entity_type ?? "—" },
          { header: "Due", cell: (r: any) => formatDate(r.due_date) },
          { header: "Status", cell: (r: any) => <StatusBadge status={r.status} /> },
        ],
      }} />
    </ProtectedRoute>
  ),
});
