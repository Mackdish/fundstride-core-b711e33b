import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GenericListPage } from "@/components/GenericListPage";
import { StatusBadge } from "@/components/StatusBadge";
import { formatKES, formatDate } from "@/lib/format";

export const Route = createFileRoute("/payments/")({
  component: () => (
    <ProtectedRoute roles={["super_admin","finance_officer"]}>
      <GenericListPage config={{
        title: "Payments", description: "Disbursement queue with dual authorization.",
        table: "payments",
        select: "*, beneficiary:beneficiaries(id,name)",
        searchFields: ["purpose"], deletable: true,
        newHref: "/payments/new",
        detailHref: (r: any) => `/payments/${r.id}`,
        statusOptions: [
          { value: "pending", label: "Pending" }, { value: "active", label: "Authorized" },
          { value: "completed", label: "Confirmed" }, { value: "rejected", label: "Failed" },
        ],
        columns: [
          { header: "Beneficiary", cell: (r: any) => r.beneficiary?.name ?? "—" },
          { header: "Amount", cell: (r: any) => formatKES(r.amount) },
          { header: "Purpose", cell: (r: any) => r.purpose ?? "—" },
          { header: "Status", cell: (r: any) => <StatusBadge status={r.status} /> },
          { header: "Created", cell: (r: any) => formatDate(r.created_at) },
        ],
      }} />
    </ProtectedRoute>
  ),
});
