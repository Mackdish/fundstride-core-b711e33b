import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/admin/settings")({
  component: () => <ProtectedRoute roles={["super_admin"]}><ComingSoon title="System settings" description="Approval matrix, product limits, fee schedules, master data." /></ProtectedRoute>,
});
