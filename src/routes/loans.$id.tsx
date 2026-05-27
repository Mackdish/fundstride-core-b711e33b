import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/loans/$id")({
  component: () => <ProtectedRoute><ComingSoon title="Facility detail" description="Repayment schedule, covenants, drawdown history, activation controls." /></ProtectedRoute>,
});
