import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/contractors/$id")({
  component: () => <ProtectedRoute><ComingSoon title="Contractor profile" description="Contracts, performance scores, compliance documents." /></ProtectedRoute>,
});
