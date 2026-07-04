import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GenericListPage } from "@/components/GenericListPage";
import { StatusBadge } from "@/components/StatusBadge";
import { formatKES, formatDate } from "@/lib/format";

export const Route = createFileRoute("/payments/")({
  component: () => (
    <ProtectedRoute roles={["super_admin","finance","finance_officer","executive"]}>
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
          { header: "Receipt", className: "w-1", cell: (r: any) => (
            <Link
              to="/payments/$id/receipt"
              params={{ id: r.id }}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-slate-200 text-xs hover:bg-slate-50 text-slate-700"
              title="Download receipt (PDF)"
            >
              <FileText className="h-3.5 w-3.5" /> Download
            </Link>
          )},
        ],
      }} />
    </ProtectedRoute>
  ),
});

