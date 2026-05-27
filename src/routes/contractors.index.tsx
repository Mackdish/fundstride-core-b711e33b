import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GenericListPage } from "@/components/GenericListPage";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/contractors/")({
  component: () => (
    <ProtectedRoute roles={["super_admin","operations_officer","credit_officer"]}>
      <GenericListPage config={{
        title: "Contractors", description: "Approved contractor directory.",
        table: "contractors", searchFields: ["name","specialization","registration_number"],
        detailHref: (r: any) => `/contractors/${r.id}`,
        statusOptions: [{ value: "active", label: "Active" }, { value: "blocked", label: "Blocked" }],
        columns: [
          { header: "Name", cell: (r: any) => <span className="font-medium">{r.name}</span> },
          { header: "Reg No.", cell: (r: any) => r.registration_number ?? "—" },
          { header: "Specialization", cell: (r: any) => r.specialization ?? "—" },
          { header: "NCA", cell: (r: any) => r.nca_category ?? "—" },
          { header: "Status", cell: (r: any) => <StatusBadge status={r.status} /> },
        ],
      }} />
    </ProtectedRoute>
  ),
});
