import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Building2, Users, FolderKanban, Wallet, Receipt, UserCog } from "lucide-react";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatKES, formatDate } from "@/lib/format";
import { getCompanyDetails } from "@/lib/admin-tenants.functions";

export const Route = createFileRoute("/admin/companies/$id")({
  component: () => (
    <ProtectedRoute roles={["platform_admin", "super_admin"]}>
      <CompanyDetail />
    </ProtectedRoute>
  ),
});

function CompanyDetail() {
  const { id } = Route.useParams();
  const fetchDetails = useServerFn(getCompanyDetails);
  const { data, isLoading } = useQuery({
    queryKey: ["company-details", id],
    queryFn: () => fetchDetails({ data: { tenant_id: id } }),
  });

  if (isLoading || !data) return <div className="h-64 bg-slate-50 animate-pulse rounded-xl" />;

  const { tenant, settings, users, customers, projects, loans, payments } = data;

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title={tenant.name}
        description="Full company profile · cross-tenant super-admin view"
        actions={
          <Link to="/admin/companies" className="h-9 px-3 rounded-md border border-slate-200 text-sm inline-flex items-center gap-1.5 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" /> Back to companies
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Stat icon={Users} label="Users" value={users.length} />
        <Stat icon={UserCog} label="Customers" value={customers.length} />
        <Stat icon={FolderKanban} label="Projects" value={projects.length} />
        <Stat icon={Wallet} label="Loans" value={loans.length} />
        <Stat icon={Receipt} label="Payments" value={payments.length} />
        <Stat icon={Building2} label="Status" value={<StatusBadge status={tenant.status ?? "active"} />} />
      </div>

      <Section title="Company profile">
        <KV k="Name" v={tenant.name} />
        <KV k="Currency" v={tenant.currency ?? "—"} />
        <KV k="Created" v={formatDate(tenant.created_at)} />
        {settings && <>
          <KV k="Current fiscal year" v={settings.current_year ?? "—"} />
          <KV k="Annual interest %" v={settings.annual_interest_rate ?? "—"} />
        </>}
      </Section>

      <Section title="Users">
        <DataTable
          rows={users}
          columns={[
            { header: "Email", cell: (u: any) => <span className="font-medium">{u.email}</span> },
            { header: "Name", cell: (u: any) => u.full_name ?? "—" },
            { header: "Roles", cell: (u: any) => u.roles.length ? u.roles.join(", ") : "—" },
            { header: "Status", cell: (u: any) => <StatusBadge status={u.status ?? "active"} /> },
            { header: "Joined", cell: (u: any) => formatDate(u.created_at) },
          ]}
          empty={<EmptyState title="No users" message="This company has no users yet." />}
        />
      </Section>

      <Section title="Customers">
        <DataTable rows={customers} columns={[
          { header: "Name", cell: (c: any) => c.name },
          { header: "Type", cell: (c: any) => c.type ?? "—" },
          { header: "Status", cell: (c: any) => <StatusBadge status={c.status ?? "—"} /> },
          { header: "Created", cell: (c: any) => formatDate(c.created_at) },
        ]} empty={<EmptyState title="No customers" message="—" />} />
      </Section>

      <Section title="Projects">
        <DataTable rows={projects} columns={[
          { header: "Name", cell: (p: any) => p.name },
          { header: "Budget", cell: (p: any) => p.budget_amount ? formatKES(p.budget_amount) : "—" },
          { header: "Status", cell: (p: any) => <StatusBadge status={p.status ?? "—"} /> },
          { header: "Created", cell: (p: any) => formatDate(p.created_at) },
        ]} empty={<EmptyState title="No projects" message="—" />} />
      </Section>

      <Section title="Loan facilities">
        <DataTable rows={loans} columns={[
          { header: "Account", cell: (l: any) => l.account_number ?? "—" },
          { header: "Approved", cell: (l: any) => l.approved_amount ? formatKES(l.approved_amount) : "—" },
          { header: "Status", cell: (l: any) => <StatusBadge status={l.status ?? "—"} /> },
          { header: "Created", cell: (l: any) => formatDate(l.created_at) },
        ]} empty={<EmptyState title="No loans" message="—" />} />
      </Section>

      <Section title="Payments">
        <DataTable rows={payments} columns={[
          { header: "Amount", cell: (p: any) => formatKES(p.amount) },
          { header: "Status", cell: (p: any) => <StatusBadge status={p.status ?? "—"} /> },
          { header: "Created", cell: (p: any) => formatDate(p.created_at) },
        ]} empty={<EmptyState title="No payments" message="—" />} />
      </Section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs text-slate-500"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="px-5 py-3 border-b border-slate-200 font-semibold text-slate-900">{title}</div>
      <div className="p-5 space-y-1">{children}</div>
    </section>
  );
}

function KV({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-100 text-sm last:border-0">
      <span className="text-slate-500">{k}</span>
      <span className="text-slate-900 font-medium text-right">{v ?? "—"}</span>
    </div>
  );
}
