import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GenericListPage } from "@/components/GenericListPage";
import { StatusBadge } from "@/components/StatusBadge";
import { formatKES, formatDate } from "@/lib/format";

export const Route = createFileRoute("/drawdowns/")({
  component: () => (
    <ProtectedRoute>
      <GenericListPage config={{
        title: "Drawdowns", description: "Milestone-based disbursement pipeline.",
        table: "drawdown_requests", searchFields: ["id"],
        detailHref: (r: any) => `/drawdowns/${r.id}`,
        statusOptions: [
          { value: "pending", label: "Pending" }, { value: "active", label: "Approved" }, { value: "rejected", label: "Rejected" }, { value: "blocked", label: "Blocked" },
        ],
        columns: [
          { header: "Requested", cell: (r: any) => formatKES(r.requested_amount) },
          { header: "Certified", cell: (r: any) => formatKES(r.certified_amount) },
          { header: "Status", cell: (r: any) => <StatusBadge status={r.status} /> },
          { header: "Created", cell: (r: any) => formatDate(r.created_at) },
        ],
      }} />
    </ProtectedRoute>
  ),
});
