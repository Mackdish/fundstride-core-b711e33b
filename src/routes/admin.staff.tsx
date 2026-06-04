import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, ShieldBan, ShieldCheck, KeyRound, Search, Trash2 } from "lucide-react";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  createStaffMember, updateStaffMember, setStaffStatus, resetStaffPassword, deleteStaffMember,
} from "@/lib/admin-staff.functions";

export const Route = createFileRoute("/admin/staff")({
  component: () => (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <StaffMembersPage />
    </ProtectedRoute>
  ),
});

type StaffRole = "admin" | "operations";
const ROLE_LABEL: Record<StaffRole, string> = { admin: "Admin", operations: "Staff User" };
const DEPARTMENTS: Array<[string, string]> = [
  ["finance", "Finance"], ["projects", "Projects"], ["sales_bd", "Sales & BD"],
  ["it", "IT"], ["legal_compliance", "Legal & Compliance"], ["operations", "Operations"],
];
const EMPLOYMENT: Array<[string, string]> = [
  ["full_time", "Full-Time"], ["part_time", "Part-Time"], ["contract", "Contract"],
];

type Row = {
  id: string; email: string; full_name: string | null; phone: string | null;
  job_title: string | null; department: string | null; employment_type: string | null;
  start_date: string | null; id_number: string | null; gender: string | null;
  date_of_birth: string | null; status: string; created_at: string;
  emergency_contact_name: string | null; emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  role: StaffRole;
};

function StaffMembersPage() {
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<string>("all");
  const [roleF, setRoleF] = useState<string>("all");

  const create = useServerFn(createStaffMember);
  const update = useServerFn(updateStaffMember);
  const setStatus = useServerFn(setStaffStatus);
  const reset = useServerFn(resetStaffPassword);
  const del = useServerFn(deleteStaffMember);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: async (): Promise<Row[]> => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roleByUser: Record<string, string> = {};
      (r.data ?? []).forEach((x: any) => {
        // Pick a primary role; prefer admin/super_admin if present.
        const cur = roleByUser[x.user_id];
        if (!cur || x.role === "admin" || x.role === "super_admin") roleByUser[x.user_id] = x.role;
      });
      return (p.data ?? []).map((u: any) => {
        const raw = roleByUser[u.id];
        const role: StaffRole = raw === "admin" || raw === "super_admin" ? "admin" : "operations";
        return { ...u, role };
      });
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-staff"] });

  const filtered = useMemo(() => {
    let rows = data ?? [];
    const needle = q.trim().toLowerCase();
    if (needle) rows = rows.filter((r) =>
      [r.full_name, r.email, r.phone, r.job_title, r.department].some((v) => (v ?? "").toString().toLowerCase().includes(needle)),
    );
    if (statusF !== "all") rows = rows.filter((r) => r.status === statusF);
    if (roleF !== "all") rows = rows.filter((r) => r.role === roleF);
    return rows;
  }, [data, q, statusF, roleF]);

  const mStatus = useMutation({
    mutationFn: async ({ r, status }: { r: Row; status: "active" | "inactive" | "suspended" }) => {
      await setStatus({ data: { user_id: r.id, status } });
      await logAudit("status_change", "staff", r.id, { status: r.status }, { status });
    },
    onSuccess: () => { toast.success("Status updated"); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const mReset = useMutation({
    mutationFn: async (r: Row) => { await reset({ data: { user_id: r.id } }); await logAudit("reset_password", "staff", r.id, null, null); },
    onSuccess: () => toast.success("Password reset email sent"),
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const mDelete = useMutation({
    mutationFn: async (r: Row) => { await del({ data: { user_id: r.id } }); await logAudit("delete", "staff", r.id, r, null); },
    onSuccess: () => { toast.success("Staff member deleted"); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <>
      <PageHeader
        title="Staff Members"
        description="Manage company staff: roles, status, and access."
        actions={
          <button onClick={() => setCreateOpen(true)} className="h-10 px-4 rounded-md bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2D5F8A] flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Staff Member
          </button>
        }
      />

      <div className="mb-3 flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, job title…"
            className="h-10 pl-9 pr-3 w-full rounded-md border border-slate-200 bg-white text-sm" />
        </div>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="h-10 px-3 rounded-md border border-slate-200 bg-white text-sm">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
        <select value={roleF} onChange={(e) => setRoleF(e.target.value)} className="h-10 px-3 rounded-md border border-slate-200 bg-white text-sm">
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="operations">Staff User</option>
        </select>
      </div>

      <DataTable
        loading={isLoading}
        rows={filtered}
        columns={[
          { header: "Full Name", cell: (r) => <span className="font-medium">{r.full_name ?? "—"}</span> },
          { header: "Email", cell: (r) => r.email },
          { header: "Phone", cell: (r) => r.phone ?? "—" },
          { header: "Job Title", cell: (r) => r.job_title ?? "—" },
          { header: "Department", cell: (r) => DEPARTMENTS.find(([v]) => v === r.department)?.[1] ?? "—" },
          { header: "Role", cell: (r) => ROLE_LABEL[r.role] },
          { header: "Status", cell: (r) => <StatusBadge s={r.status} /> },
          { header: "Date Added", cell: (r) => formatDate(r.created_at) },
          { header: "", className: "w-1 text-right", cell: (r) => (
            <div className="flex justify-end gap-1">
              <IconBtn title="Edit" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></IconBtn>
              <IconBtn title="Reset password" onClick={() => { if (confirm(`Send password reset to ${r.email}?`)) mReset.mutate(r); }}><KeyRound className="h-4 w-4" /></IconBtn>
              {r.status === "active" ? (
                <IconBtn title="Deactivate" disabled={r.id === me?.id} onClick={() => { const s = prompt("Set status to 'inactive' or 'suspended':", "inactive"); if (s === "inactive" || s === "suspended") { if (confirm(`Change ${r.email} to ${s}?`)) mStatus.mutate({ r, status: s }); } }}>
                  <ShieldBan className="h-4 w-4" />
                </IconBtn>
              ) : (
                <IconBtn title="Reactivate" onClick={() => { if (confirm(`Reactivate ${r.email}?`)) mStatus.mutate({ r, status: "active" }); }}>
                  <ShieldCheck className="h-4 w-4" />
                </IconBtn>
              )}
            </div>
          )},
        ]}
        empty={<EmptyState title="No staff members yet" message="Click Add Staff Member to create the first one." />}
      />

      {createOpen && (
        <StaffDialog
          title="Add Staff Member"
          submitLabel="Create Staff Member"
          requirePassword
          onClose={() => setCreateOpen(false)}
          onSubmit={async (payload) => {
            await create({ data: payload as any });
            await logAudit("create", "staff", null, null, { email: payload.email });
            toast.success("Staff member created");
            setCreateOpen(false);
            refresh();
          }}
        />
      )}

      {editing && (
        <StaffDialog
          title={`Edit · ${editing.full_name ?? editing.email}`}
          submitLabel="Save changes"
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (payload) => {
            await update({ data: { ...(payload as any), user_id: editing.id } });
            await logAudit("update", "staff", editing.id, editing, payload);
            toast.success("Updated");
            setEditing(null);
            refresh();
          }}
        />
      )}
    </>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700",
    inactive: "bg-slate-100 text-slate-600",
    suspended: "bg-amber-50 text-amber-700",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${map[s] ?? "bg-slate-100 text-slate-600"}`}>{s}</span>;
}

function IconBtn({ children, onClick, title, disabled }: { children: React.ReactNode; onClick: () => void; title: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 disabled:opacity-40">
      {children}
    </button>
  );
}

type DialogPayload = {
  first_name: string; last_name: string; email: string; phone: string | null;
  id_number: string | null; gender: string | null; date_of_birth: string | null;
  job_title: string; department: string; employment_type: string; start_date: string | null;
  role: StaffRole; password?: string; force_password_change?: boolean;
  emergency_contact_name: string | null; emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
};

function StaffDialog({
  title, submitLabel, initial, requirePassword, onClose, onSubmit,
}: {
  title: string; submitLabel: string; initial?: Row; requirePassword?: boolean;
  onClose: () => void; onSubmit: (p: DialogPayload) => Promise<void>;
}) {
  const parts = (initial?.full_name ?? "").split(" ");
  const [firstName, setFirstName] = useState(parts[0] ?? "");
  const [lastName, setLastName] = useState(parts.slice(1).join(" ") ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [idNum, setIdNum] = useState(initial?.id_number ?? "");
  const [gender, setGender] = useState(initial?.gender ?? "");
  const [dob, setDob] = useState(initial?.date_of_birth ?? "");
  const [jobTitle, setJobTitle] = useState(initial?.job_title ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "finance");
  const [employmentType, setEmploymentType] = useState(initial?.employment_type ?? "full_time");
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [role, setRole] = useState<StaffRole>(initial?.role ?? "operations");
  const [password, setPassword] = useState("");
  const [forcePw, setForcePw] = useState(true);
  const [ecName, setEcName] = useState(initial?.emergency_contact_name ?? "");
  const [ecPhone, setEcPhone] = useState(initial?.emergency_contact_phone ?? "");
  const [ecRel, setEcRel] = useState(initial?.emergency_contact_relationship ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!firstName || !lastName || !email || !jobTitle) { toast.error("Fill required fields"); return; }
    if (requirePassword && password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setBusy(true);
    try {
      const payload: DialogPayload = {
        first_name: firstName, last_name: lastName, email, phone: phone || null,
        id_number: idNum || null, gender: (gender as any) || null, date_of_birth: dob || null,
        job_title: jobTitle, department, employment_type: employmentType, start_date: startDate || null,
        role, emergency_contact_name: ecName || null, emergency_contact_phone: ecPhone || null,
        emergency_contact_relationship: ecRel || null,
      };
      if (requirePassword) { payload.password = password; payload.force_password_change = forcePw; }
      await onSubmit(payload);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 font-semibold text-slate-900">{title}</div>
        <div className="p-5 space-y-5">
          <Section title="Personal Information">
            <Grid>
              <Field label="First Name *"><input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} /></Field>
              <Field label="Last Name *"><input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} /></Field>
              <Field label="Email Address *"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>
              <Field label="Phone Number"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} /></Field>
              <Field label="ID / National ID"><input value={idNum} onChange={(e) => setIdNum(e.target.value)} className={inputCls} /></Field>
              <Field label="Gender">
                <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputCls}>
                  <option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                </select>
              </Field>
              <Field label="Date of Birth"><input type="date" value={dob ?? ""} onChange={(e) => setDob(e.target.value)} className={inputCls} /></Field>
            </Grid>
          </Section>

          <Section title="Employment Details">
            <Grid>
              <Field label="Job Title *"><input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className={inputCls} /></Field>
              <Field label="Department">
                <select value={department} onChange={(e) => setDepartment(e.target.value)} className={inputCls}>
                  {DEPARTMENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Employment Type">
                <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} className={inputCls}>
                  {EMPLOYMENT.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Start Date"><input type="date" value={startDate ?? ""} onChange={(e) => setStartDate(e.target.value)} className={inputCls} /></Field>
            </Grid>
          </Section>

          <Section title="System Access">
            <Grid>
              <Field label="Role">
                <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className={inputCls}>
                  <option value="admin">Admin</option>
                  <option value="operations">Staff User</option>
                </select>
              </Field>
              {requirePassword && (
                <Field label="Temporary Password *"><input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="Min. 8 characters" /></Field>
              )}
              {requirePassword && (
                <Field label="Force password change on first login">
                  <label className="flex items-center gap-2 h-10"><input type="checkbox" checked={forcePw} onChange={(e) => setForcePw(e.target.checked)} /> Enabled</label>
                </Field>
              )}
            </Grid>
          </Section>

          <Section title="Emergency Contact">
            <Grid>
              <Field label="Contact Name"><input value={ecName} onChange={(e) => setEcName(e.target.value)} className={inputCls} /></Field>
              <Field label="Contact Phone"><input value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} className={inputCls} /></Field>
              <Field label="Relationship"><input value={ecRel} onChange={(e) => setEcRel(e.target.value)} className={inputCls} /></Field>
            </Grid>
          </Section>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button onClick={onClose} className="h-9 px-4 rounded-md border border-slate-200 text-sm bg-white">Cancel</button>
          <button onClick={submit} disabled={busy} className="h-9 px-4 rounded-md bg-[#1E3A5F] text-white text-sm disabled:opacity-60">{busy ? "Working…" : submitLabel}</button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "h-10 w-full px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs font-medium text-slate-600 mb-1 block">{label}</label>{children}</div>;
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><div className="text-sm font-semibold text-slate-900 mb-2">{title}</div>{children}</div>;
}
