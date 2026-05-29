import { createFileRoute, Link } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GenericListPage } from "@/components/GenericListPage";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatKES } from "@/lib/format";

export const Route = createFileRoute("/monitoring/")({
  component: () => (
    <ProtectedRoute roles={["super_admin", "credit_officer", "risk_compliance_officer", "executive"]}>
      <GenericListPage config={{
        title: "Credit monitoring",
        description: "Periodic credit monitoring reports for active facilities.",
        table: "credit_monitoring_reports",
        searchFields: ["repayment_status", "relationship_officer"],
        deletable: true,
        newHref: "/monitoring/new",
        detailHref: (r: any) => `/monitoring/${r.id}`,
        statusOptions: [
          { value: "draft", label: "Draft" },
          { value: "submitted", label: "Submitted" },
          { value: "reviewed", label: "Reviewed" },
        ],
        columns: [
          { header: "Report date", cell: (r: any) => formatDate(r.report_date) },
          { header: "Officer", cell: (r: any) => r.relationship_officer ?? "—" },
          { header: "DPD", cell: (r: any) => r.days_past_due ?? 0 },
          { header: "Arrears", cell: (r: any) => formatKES(r.arrears_amount) },
          { header: "Status", cell: (r: any) => <StatusBadge status={r.status} /> },
          { header: "Loan", cell: (r: any) => <Link to="/loans/$id" params={{ id: r.loan_id }} className="text-[#1E3A5F] underline">view</Link> },
        ],
      }} />
    </ProtectedRoute>
  ),
});
