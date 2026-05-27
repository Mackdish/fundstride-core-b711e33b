import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/appraisals/$id")({
  component: () => <ProtectedRoute><ComingSoon title="Appraisal detail" description="Borrower assessment, project viability, collateral, cash flow, contractor risk. Build coming in Phase 1.1." /></ProtectedRoute>,
});
