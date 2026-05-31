import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GenericListPage } from "@/components/GenericListPage";
import { StatusBadge } from "@/components/StatusBadge";
import { formatKES, formatDate, formatPct } from "@/lib/format";

export const Route = createFileRoute("/loans/")({
  component: () => (
    <ProtectedRoute roles={["super_admin","credit_officer","finance_officer","executive"]}>
      <GenericListPage config={{
        title: "Loan facilities", description: "Active and historical loan facilities.",
        table: "loan_facilities",
        select: "*, customer:customers(id,name), project:projects(id,name)",
        searchFields: ["id","account_number","product_type"], deletable: true,
        newHref: "/loans/new",
        detailHref: (r: any) => `/loans/${r.id}`,
        statusOptions: [
          { value: "draft", label: "Draft" }, { value: "active", label: "Active" }, { value: "closed", label: "Closed" },
        ],
        columns: [
          { header: "Customer", cell: (r: any) => <span className="font-medium text-slate-900">{r.customer?.name ?? "—"}</span> },
          { header: "Loan amount", cell: (r: any) => formatKES(r.approved_amount) },
          { header: "Project financed", cell: (r: any) => r.project?.name ?? "—" },
          { header: "Rate", cell: (r: any) => formatPct(r.interest_rate) },
          { header: "Tenor", cell: (r: any) => `${r.tenor_months} mo` },
          { header: "Status", cell: (r: any) => <StatusBadge status={r.status} /> },
          { header: "Activated", cell: (r: any) => formatDate(r.activated_at) },
        ],
      }} />
    </ProtectedRoute>
  ),
});
