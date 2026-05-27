import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GenericListPage } from "@/components/GenericListPage";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/customers/")({
  component: () => (
    <ProtectedRoute>
      <GenericListPage config={{
        title: "Customers", description: "Developers and corporate borrowers.",
        table: "customers", searchFields: ["name", "email", "pin"],
        newHref: "/customers/new",
        detailHref: (r: any) => `/customers/${r.id}`,
        statusOptions: [
          { value: "draft", label: "Draft" }, { value: "pending", label: "Pending" },
          { value: "active", label: "Active" }, { value: "rejected", label: "Rejected" },
        ],
        columns: [
          { header: "Name", cell: (r: any) => <span className="font-medium text-slate-900">{r.name}</span> },
          { header: "Type", cell: (r: any) => r.customer_type ?? "—" },
          { header: "PIN", cell: (r: any) => r.pin ?? "—" },
          { header: "Email", cell: (r: any) => r.email ?? "—" },
          { header: "Status", cell: (r: any) => <StatusBadge status={r.status} /> },
          { header: "Created", cell: (r: any) => formatDate(r.created_at) },
        ],
      }} />
    </ProtectedRoute>
  ),
});
