import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GenericListPage } from "@/components/GenericListPage";
import { StatusBadge } from "@/components/StatusBadge";
import { formatKES, formatDate, formatPct } from "@/lib/format";

export const Route = createFileRoute("/appraisals/")({
  component: () => (
    <ProtectedRoute roles={["super_admin","credit_officer","risk_compliance_officer","executive"]}>
      <GenericListPage config={{
        title: "Appraisals", description: "Credit appraisal queue.",
        table: "appraisals", searchFields: ["id"],
        detailHref: (r: any) => `/appraisals/${r.id}`,
        statusOptions: [
          { value: "draft", label: "Draft" }, { value: "pending", label: "Pending" }, { value: "active", label: "Approved" }, { value: "rejected", label: "Rejected" },
        ],
        columns: [
          { header: "Requested", cell: (r: any) => formatKES(r.requested_amount) },
          { header: "Recommended", cell: (r: any) => formatKES(r.recommended_amount) },
          { header: "LTV", cell: (r: any) => formatPct(r.ltv != null ? r.ltv * 100 : null) },
          { header: "DSCR", cell: (r: any) => r.dscr ?? "—" },
          { header: "Grade", cell: (r: any) => <StatusBadge status={r.grade} /> },
          { header: "Status", cell: (r: any) => <StatusBadge status={r.status} /> },
          { header: "Created", cell: (r: any) => formatDate(r.created_at) },
        ],
      }} />
    </ProtectedRoute>
  ),
});
