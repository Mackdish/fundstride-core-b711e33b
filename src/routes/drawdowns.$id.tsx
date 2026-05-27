import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/drawdowns/$id")({
  component: () => <ProtectedRoute><ComingSoon title="Drawdown detail" description="Approval pipeline: Submitted → Site inspection → QS certification → Risk → Finance → Released." /></ProtectedRoute>,
});
