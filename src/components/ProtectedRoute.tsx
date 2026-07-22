import { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { useAuth, AppRole } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: AppRole[] }) {
  const { user, loading, hasRole, roles: myRoles } = useAuth();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" />;
  // Customer-only accounts belong on the customer portal, never in staff pages.
  const isStaff = hasRole(
    "super_admin","platform_admin","admin","executive","finance","credit","operations",
    "credit_officer","operations_officer","site_monitoring_officer",
    "finance_officer","risk_compliance_officer",
  );
  if (!isStaff && myRoles.includes("customer")) return <Navigate to="/portal" />;
  // Executive (and super_admin / platform_admin) have full access across the system.
  const isFullAccess = hasRole("executive", "super_admin", "platform_admin");
  if (!isFullAccess && roles && roles.length > 0 && !hasRole(...roles)) {
    return <Navigate to="/forbidden" />;
  }
  return <AppShell>{children}</AppShell>;
}
