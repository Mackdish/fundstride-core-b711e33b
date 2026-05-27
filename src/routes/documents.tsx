import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/documents")({
  component: () => <ProtectedRoute><ComingSoon title="Document management" description="Central repository, versioning, expiry tracking, and download audit logs." /></ProtectedRoute>,
});
