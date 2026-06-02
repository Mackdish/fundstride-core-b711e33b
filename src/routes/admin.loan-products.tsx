import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/loan-products")({
  component: () => <Outlet />,
});
