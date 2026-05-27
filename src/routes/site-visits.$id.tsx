import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/site-visits/$id")({
  component: () => <ProtectedRoute><ComingSoon title="Site visit detail" description="Mobile-optimized report with photos, GPS, stage completion sliders, and issues." /></ProtectedRoute>,
});
