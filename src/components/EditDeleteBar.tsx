import { useState, ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export type EditField =
  | { key: string; label: string; type?: "text" | "number" | "email" | "date" }
  | { key: string; label: string; type: "select"; options: string[] }
  | { key: string; label: string; type: "textarea" };

export function EditDeleteBar({
  table, id, row, fields, queryKey, redirectAfterDelete,
}: {
  table: string;
  id: string;
  row: Record<string, any>;
  fields: EditField[];
  queryKey: unknown[];
  redirectAfterDelete?: string;
}) {
  const { isStaff } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  if (!isStaff) return null;

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
      await logAudit("delete", table, id, row, null);
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey });
      if (redirectAfterDelete) nav({ to: redirectAfterDelete });
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => setOpen(true)} className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
        <Pencil className="h-4 w-4" /> Edit
      </button>
      <button
        onClick={() => { if (confirm("Delete this record? This cannot be undone.")) remove.mutate(); }}
        className="h-9 px-3 rounded-md border border-red-200 bg-white text-sm font-medium hover:bg-red-50 text-red-600 flex items-center gap-2"
      >
        <Trash2 className="h-4 w-4" /> Delete
      </button>
      {open && (
        <EditDialog
          table={table} id={id} row={row} fields={fields}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey }); }}
        />
      )}
    </div>
  );
}

function EditDialog({ table, id, row, fields, onClose, onSaved }: {
  table: string; id: string; row: Record<string, any>; fields: EditField[];
  onClose: () => void; onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, any>>(() =>
    Object.fromEntries(fields.map(f => [f.key, row[f.key] ?? ""])));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const patch: Record<string, any> = {};
      for (const f of fields) {
        const v = values[f.key];
        patch[f.key] = v === "" ? null : f.type === "number" ? Number(v) : v;
      }
      const { error } = await supabase.from(table as any).update(patch).eq("id", id);
      if (error) throw error;
      await logAudit("update", table, id, row, patch);
      toast.success("Saved");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-200 font-semibold text-slate-900">Edit record</div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {fields.map((f) => (
            <Field key={f.key} label={f.label}>
              {renderInput(f, values[f.key], (v) => setValues((s) => ({ ...s, [f.key]: v })))}
            </Field>
          ))}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
          <button onClick={onClose} className="h-9 px-4 rounded-md border border-slate-200 text-sm">Cancel</button>
          <button onClick={save} disabled={busy} className="h-9 px-4 rounded-md bg-[#1E3A5F] text-white text-sm disabled:opacity-60">{busy ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "h-10 w-full px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30";
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><label className="text-sm text-slate-700">{label}</label>{children}</div>;
}
function renderInput(f: EditField, val: any, set: (v: any) => void) {
  if (f.type === "select") return (
    <select value={val ?? ""} onChange={(e) => set(e.target.value)} className={inputCls}>
      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  if (f.type === "textarea") return (
    <textarea value={val ?? ""} onChange={(e) => set(e.target.value)} className={`${inputCls} h-24 py-2`} />
  );
  return <input type={f.type ?? "text"} value={val ?? ""} onChange={(e) => set(e.target.value)} className={inputCls} />;
}
