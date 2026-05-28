import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GenericListPage } from "@/components/GenericListPage";
import { StatusBadge } from "@/components/StatusBadge";
import { formatKES, formatDate } from "@/lib/format";

export const Route = createFileRoute("/projects/")({
  component: () => (
    <ProtectedRoute>
      <GenericListPage config={{
        title: "Projects", description: "Construction projects financed by Kinetic.",
        table: "projects", searchFields: ["name", "location"], deletable: true,
        newHref: "/projects/new",
        detailHref: (r: any) => `/projects/${r.id}`,
        statusOptions: [
          { value: "draft", label: "Draft" }, { value: "active", label: "Active" },
          { value: "completed", label: "Completed" },
        ],
        columns: [
          { header: "Name", cell: (r: any) => <span className="font-medium text-slate-900">{r.name}</span> },
          { header: "Location", cell: (r: any) => r.location ?? "—" },
          { header: "Type", cell: (r: any) => r.project_type ?? "—" },
          { header: "Units", cell: (r: any) => r.units ?? "—" },
          { header: "Expected value", cell: (r: any) => formatKES(r.expected_value) },
          { header: "Status", cell: (r: any) => <StatusBadge status={r.status} /> },
          { header: "Created", cell: (r: any) => formatDate(r.created_at) },
        ],
      }} />
    </ProtectedRoute>
  ),
});
