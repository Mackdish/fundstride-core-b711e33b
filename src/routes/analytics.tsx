import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/analytics")({
  component: () => <ProtectedRoute roles={["super_admin","executive"]}><ComingSoon title="Executive analytics" description="Portfolio dashboards, PAR 30, geographic distribution, board-pack export." /></ProtectedRoute>,
});
