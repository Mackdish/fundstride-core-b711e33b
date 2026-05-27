import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/admin/users")({
  component: () => <ProtectedRoute roles={["super_admin"]}><UsersAdmin /></ProtectedRoute>,
});

function UsersAdmin() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const rolesByUser: Record<string, string[]> = {};
      (r.data ?? []).forEach((x: any) => { rolesByUser[x.user_id] = [...(rolesByUser[x.user_id] ?? []), x.role]; });
      return (p.data ?? []).map((u: any) => ({ ...u, roles: rolesByUser[u.id] ?? [] }));
    },
  });

  return (
    <>
      <PageHeader title="Users" description="System users and role assignments." />
      <DataTable
        loading={isLoading}
        rows={(data ?? []) as any[]}
        columns={[
          { header: "Email", cell: (r: any) => <span className="font-medium">{r.email}</span> },
          { header: "Name", cell: (r: any) => r.full_name ?? "—" },
          { header: "Roles", cell: (r: any) => r.roles.join(", ") || "—" },
          { header: "Status", cell: (r: any) => r.status },
          { header: "Joined", cell: (r: any) => formatDate(r.created_at) },
        ]}
        empty={<EmptyState title="No users yet" message="Users appear here after signup." />}
      />
    </>
  );
}
