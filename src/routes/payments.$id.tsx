import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/payments/$id")({
  component: () => <ProtectedRoute roles={["super_admin","finance_officer"]}><ComingSoon title="Payment detail" description="Beneficiary verification, dual-authorization controls, reconciliation." /></ProtectedRoute>,
});
