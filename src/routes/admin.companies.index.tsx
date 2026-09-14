import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Building2, ChevronRight } from "lucide-react";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { Field, fieldCls } from "@/components/form-fields";
import { formatDate } from "@/lib/format";
import { createCompany, listCompanies, deleteCompany } from "@/lib/admin-tenants.functions";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/admin/companies/")({
  component: () => <ProtectedRoute roles={["platform_admin", "super_admin"]}><CompaniesAdmin /></ProtectedRoute>,
});

function CompaniesAdmin() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const list = useServerFn(listCompanies);
  const create = useServerFn(createCompany);
  const remove = useServerFn(deleteCompany);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["companies"], queryFn: () => list() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["companies"] });

  const mDelete = useMutation({
    mutationFn: async (id: string) => { await remove({ data: { tenant_id: id } }); await logAudit("delete", "tenant", id); },
    onSuccess: () => { toast.success("Company deleted"); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <>
      <PageHeader
        title="Companies"
        description="Create new tenant companies and provision their first Company Admin."
        actions={
          <button onClick={() => setOpen(true)} className="h-10 px-4 rounded-md bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2D5F8A] flex items-center gap-2">
            <Plus className="h-4 w-4" /> New company
          </button>
        }
      />
      <DataTable
        loading={isLoading}
        rows={(data ?? []) as any[]}
        onRowClick={(r: any) => nav({ to: "/admin/companies/$id", params: { id: r.id } })}
        columns={[
          { header: "Company", cell: (r) => <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-slate-400" /><span className="font-medium">{r.name}</span></div> },
          { header: "Admins", cell: (r) => r.admins.length ? r.admins.map((a: any) => a.email).join(", ") : "—" },
          { header: "Users", cell: (r) => r.user_count },
          { header: "Currency", cell: (r) => r.currency },
          { header: "Status", cell: (r) => <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700">{r.status}</span> },
          { header: "Created", cell: (r) => formatDate(r.created_at) },
          { header: "", className: "w-1 text-right", cell: (r) => (
            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => nav({ to: "/admin/companies/$id", params: { id: r.id } })} title="View details" className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600">
                <ChevronRight className="h-4 w-4" />
              </button>
              <button onClick={() => { if (confirm(`Delete ${r.name}? This removes all its data.`)) mDelete.mutate(r.id); }}
                className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-red-50 text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )},
        ]}
        empty={<EmptyState title="No companies yet" message="Create your first company to onboard a tenant." />}
      />

      {open && (
        <NewCompanyDialog
          onClose={() => setOpen(false)}
          onCreate={async (payload) => {
            const res = await create({ data: payload });
            if (res.tenant_id) await logAudit("create", "tenant", res.tenant_id, null, { name: payload.company_name });
            toast.success(payload.mode === "invite"
              ? `Invite sent to ${payload.admin_email}`
              : `Company created. Share these credentials with ${payload.admin_email}.`);
            setOpen(false);
            refresh();
          }}
        />
      )}
    </>
  );
}

type Payload = { company_name: string; admin_email: string; admin_full_name: string; mode: "invite" | "password"; password?: string };

function NewCompanyDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Payload) => Promise<void> }) {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState<"invite" | "password">("invite");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!companyName || !email || !fullName) { toast.error("Company, admin name and email are required"); return; }
    if (mode === "password" && password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setBusy(true);
    try { await onCreate({ company_name: companyName, admin_email: email, admin_full_name: fullName, mode, password: mode === "password" ? password : undefined }); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 font-semibold text-slate-900">New company</div>
        <div className="p-5 space-y-3">
          <Field label="Company name *"><input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={fieldCls} placeholder="Acme Construction Finance" /></Field>
          <Field label="Company Admin full name *"><input value={fullName} onChange={(e) => setFullName(e.target.value)} className={fieldCls} /></Field>
          <Field label="Company Admin email *"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldCls} /></Field>

          <div className="pt-2">
            <div className="text-sm text-slate-700 mb-2">Onboarding method</div>
            <div className="flex gap-2">
              <label className={`flex-1 border rounded-md p-3 cursor-pointer text-sm ${mode === "invite" ? "border-[#1E3A5F] bg-[#1E3A5F]/5" : "border-slate-200"}`}>
                <input type="radio" name="mode" className="mr-2" checked={mode === "invite"} onChange={() => setMode("invite")} />
                Email invite
                <div className="text-xs text-slate-500 mt-1">Admin sets their own password via email link.</div>
              </label>
              <label className={`flex-1 border rounded-md p-3 cursor-pointer text-sm ${mode === "password" ? "border-[#1E3A5F] bg-[#1E3A5F]/5" : "border-slate-200"}`}>
                <input type="radio" name="mode" className="mr-2" checked={mode === "password"} onChange={() => setMode("password")} />
                Set credentials
                <div className="text-xs text-slate-500 mt-1">You provide an initial password; share it manually.</div>
              </label>
            </div>
          </div>

          {mode === "password" && (
            <Field label="Initial password *"><input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className={fieldCls} placeholder="Min. 8 characters" /></Field>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
          <button onClick={onClose} className="h-9 px-4 rounded-md border border-slate-200 text-sm">Cancel</button>
          <button onClick={submit} disabled={busy} className="h-9 px-4 rounded-md bg-[#1E3A5F] text-white text-sm disabled:opacity-60">
            {busy ? "Creating…" : "Create company"}
          </button>
        </div>
      </div>
    </div>
  );
}
