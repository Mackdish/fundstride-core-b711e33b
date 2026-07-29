import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GenericListPage } from "@/components/GenericListPage";
import { formatDate } from "@/lib/format";

const STATUS_STYLES: Record<string, string> = {
  Discussion: "bg-blue-50 text-blue-700",
  Pending: "bg-amber-50 text-amber-700",
  Closed: "bg-emerald-50 text-emerald-700",
  Deferred: "bg-slate-100 text-slate-700",
};

export const Route = createFileRoute("/sales-leads/")({
  component: () => (
    <ProtectedRoute roles={["super_admin","executive","sales","finance","projects","credit_officer","operations_officer","finance_officer"]}>
      <GenericListPage config={{
        title: "Sales Lead Register",
        description: "Pipeline of leads — capture, qualify and close.",
        table: "sales_leads",
        searchFields: ["name","contact","location"],
        deletable: true,
        newHref: "/sales-leads/new",
        detailHref: (r: any) => `/sales-leads/${r.id}`,
        statusOptions: [
          { value: "Discussion", label: "Discussion" },
          { value: "Pending", label: "Pending" },
          { value: "Closed", label: "Closed" },
          { value: "Deferred", label: "Deferred" },
        ],
        columns: [
          { header: "Name", cell: (r: any) => <span className="font-medium text-slate-900">{r.name}</span> },
          { header: "Contact", cell: (r: any) => r.contact ?? "—" },
          { header: "Location", cell: (r: any) => r.location ?? "—" },
          { header: "Product", cell: (r: any) => r.product },
          { header: "Status", cell: (r: any) => (
            <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_STYLES[r.status] ?? "bg-slate-100"}`}>{r.status}</span>
          ) },
          { header: "Created", cell: (r: any) => formatDate(r.created_at) },
        ],
      }} />
    </ProtectedRoute>
  ),
});
