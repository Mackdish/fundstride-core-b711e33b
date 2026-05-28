import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, ShieldBan, ShieldCheck } from "lucide-react";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { AppRole, ROLE_LABELS, useAuth } from "@/lib/auth";
import { createUser, updateUserRoles, deleteUser, setUserStatus } from "@/lib/admin-users.functions";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/admin/users")({
  component: () => <ProtectedRoute roles={["super_admin"]}><UsersAdmin /></ProtectedRoute>,
});

const ALL_ROLES = Object.keys(ROLE_LABELS) as AppRole[];

type Row = { id: string; email: string; full_name: string | null; phone: string | null; status: string; created_at: string; roles: AppRole[] };

function UsersAdmin() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);

  const create = useServerFn(createUser);
  const updateRoles = useServerFn(updateUserRoles);
  const remove = useServerFn(deleteUser);
  const setStatus = useServerFn(setUserStatus);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<Row[]> => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const byUser: Record<string, AppRole[]> = {};
      (r.data ?? []).forEach((x: any) => { byUser[x.user_id] = [...(byUser[x.user_id] ?? []), x.role]; });
      return (p.data ?? []).map((u: any) => ({ ...u, roles: byUser[u.id] ?? [] }));
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const mDelete = useMutation({
    mutationFn: async (r: Row) => {
      await remove({ data: { user_id: r.id } });
      await logAudit("delete", "user", r.id, r, null);
    },
    onSuccess: () => { toast.success("User deleted"); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const mToggle = useMutation({
    mutationFn: async (r: Row) => {
      const next = r.status === "active" ? "suspended" : "active";
      await setStatus({ data: { user_id: r.id, status: next } });
      await logAudit("status_change", "user", r.id, { status: r.status }, { status: next });
    },
    onSuccess: () => { toast.success("Status updated"); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <>
      <PageHeader
        title="Users"
        description="Create accounts, assign roles, suspend or remove users."
        actions={
          <button onClick={() => setCreateOpen(true)} className="h-10 px-4 rounded-md bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2D5F8A] flex items-center gap-2">
            <Plus className="h-4 w-4" /> New user
          </button>
        }
      />
      <DataTable
        loading={isLoading}
        rows={(data ?? []) as Row[]}
        columns={[
          { header: "Email", cell: (r) => <span className="font-medium">{r.email}</span> },
          { header: "Name", cell: (r) => r.full_name ?? "—" },
          { header: "Roles", cell: (r) => r.roles.length ? r.roles.map(x => ROLE_LABELS[x]).join(", ") : "—" },
          { header: "Status", cell: (r) => (
            <span className={`px-2 py-0.5 rounded-full text-xs ${r.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{r.status}</span>
          )},
          { header: "Joined", cell: (r) => formatDate(r.created_at) },
          { header: "", className: "w-1 text-right", cell: (r) => (
            <div className="flex justify-end gap-1">
              <button onClick={() => setEditing(r)} title="Edit roles" className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => mToggle.mutate(r)} disabled={r.id === currentUser?.id} title={r.status === "active" ? "Suspend" : "Reactivate"} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 disabled:opacity-40">
                {r.status === "active" ? <ShieldBan className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              </button>
              <button onClick={() => { if (confirm(`Delete ${r.email}? This cannot be undone.`)) mDelete.mutate(r); }} disabled={r.id === currentUser?.id} title="Delete" className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-red-50 text-red-600 disabled:opacity-40">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )},
        ]}
        empty={<EmptyState title="No users yet" message="Create the first user above." />}
      />

      {createOpen && (
        <CreateUserDialog
          onClose={() => setCreateOpen(false)}
          onCreate={async (payload) => {
            await create({ data: payload });
            await logAudit("create", "user", null, null, { email: payload.email, roles: payload.roles });
            toast.success("User created");
            setCreateOpen(false);
            refresh();
          }}
        />
      )}

      {editing && (
        <EditRolesDialog
          row={editing}
          onClose={() => setEditing(null)}
          onSave={async (roles) => {
            await updateRoles({ data: { user_id: editing.id, roles } });
            await logAudit("update_roles", "user", editing.id, { roles: editing.roles }, { roles });
            toast.success("Roles updated");
            setEditing(null);
            refresh();
          }}
        />
      )}
    </>
  );
}

function CreateUserDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (p: { email: string; password: string; full_name: string; phone: string | null; roles: AppRole[] }) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [roles, setRoles] = useState<AppRole[]>(["developer"]);
  const [busy, setBusy] = useState(false);

  const toggle = (r: AppRole) => setRoles((cur) => cur.includes(r) ? cur.filter(x => x !== r) : [...cur, r]);

  const submit = async () => {
    if (!email || !password || !fullName || roles.length === 0) { toast.error("Email, password, name and at least one role are required"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setBusy(true);
    try { await onCreate({ email, password, full_name: fullName, phone: phone || null, roles }); }
    catch (e: any) { toast.error(e?.message ?? "Failed to create user"); }
    finally { setBusy(false); }
  };

  return (
    <Modal title="New user" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Full name"><input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>
          <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Temporary password"><input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="Min. 8 characters" /></Field>
        <div>
          <div className="text-sm text-slate-700 mb-2">Roles</div>
          <div className="grid grid-cols-2 gap-2">
            {ALL_ROLES.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={roles.includes(r)} onChange={() => toggle(r)} />
                {ROLE_LABELS[r]}
              </label>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter onClose={onClose} onConfirm={submit} busy={busy} label="Create user" />
    </Modal>
  );
}

function EditRolesDialog({ row, onClose, onSave }: { row: Row; onClose: () => void; onSave: (roles: AppRole[]) => Promise<void> }) {
  const [roles, setRoles] = useState<AppRole[]>(row.roles);
  const [busy, setBusy] = useState(false);
  const toggle = (r: AppRole) => setRoles((cur) => cur.includes(r) ? cur.filter(x => x !== r) : [...cur, r]);
  const submit = async () => {
    if (roles.length === 0) { toast.error("At least one role required"); return; }
    setBusy(true);
    try { await onSave(roles); } catch (e: any) { toast.error(e?.message ?? "Failed"); } finally { setBusy(false); }
  };
  return (
    <Modal title={`Edit roles · ${row.email}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {ALL_ROLES.map((r) => (
          <label key={r} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={roles.includes(r)} onChange={() => toggle(r)} />
            {ROLE_LABELS[r]}
          </label>
        ))}
      </div>
      <DialogFooter onClose={onClose} onConfirm={submit} busy={busy} label="Save roles" />
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 font-semibold text-slate-900">{title}</div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function DialogFooter({ onClose, onConfirm, busy, label }: { onClose: () => void; onConfirm: () => void; busy: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-200">
      <button onClick={onClose} className="h-9 px-4 rounded-md border border-slate-200 text-sm">Cancel</button>
      <button onClick={onConfirm} disabled={busy} className="h-9 px-4 rounded-md bg-[#1E3A5F] text-white text-sm disabled:opacity-60">{busy ? "Working…" : label}</button>
    </div>
  );
}

const inputCls = "h-10 w-full px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-sm text-slate-700">{label}</label>{children}</div>;
}
