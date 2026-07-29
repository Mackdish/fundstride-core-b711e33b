import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GenericListPage } from "@/components/GenericListPage";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/site-visits/")({
  component: () => (
    <ProtectedRoute roles={["super_admin","executive","sales","finance","projects","site_monitoring_officer","operations_officer","credit_officer"]}>
      <GenericListPage config={{
        title: "Site visits", description: "Field inspection reports and observations.",
        table: "site_visits", searchFields: ["observations","weather","purpose"], deletable: true,
        newHref: "/site-visits/new",
        detailHref: (r: any) => `/site-visits/${r.id}`,
        columns: [
          { header: "Visit date", cell: (r: any) => formatDate(r.visit_date) },
          { header: "Weather", cell: (r: any) => r.weather ?? "—" },
          { header: "GPS", cell: (r: any) => r.gps_lat && r.gps_lng ? `${r.gps_lat}, ${r.gps_lng}` : "—" },
          { header: "Status", cell: (r: any) => <StatusBadge status={r.status} /> },
        ],
      }} />
    </ProtectedRoute>
  ),
});
