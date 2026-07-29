import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EditDeleteBar } from "@/components/EditDeleteBar";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const DOC_TYPES = [
  "Architectural Drawings", "Structural Drawings", "Bill of Quantities",
  "Land Ownership", "NEMA Approval", "County Approval", "NCA Approval",
  "Insurance Certificates", "Contractor Agreement", "Consultant Agreement",
  "Project Programme", "Financial Projections", "Risk Assessment Report", "Other",
];

export const Route = createFileRoute("/projects/$id")({
  component: () => <ProtectedRoute><ProjectDetail /></ProtectedRoute>,
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { hasRole } = useAuth();
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [uploading, setUploading] = useState(false);
  const canEdit = hasRole("executive", "super_admin");

  const { data, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const [p, ms, docs] = await Promise.all([
        supabase.from("projects").select("*, customers(name)").eq("id", id).single(),
        supabase.from("milestones").select("*").eq("project_id", id).order("sequence"),
        supabase.from("project_documents").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      ]);
      return { p: p.data, milestones: ms.data ?? [], docs: docs.data ?? [] };
    },
  });

  const uploadFile = async (file: File) => {
    if (!data?.p) return;
    setUploading(true);
    try {
      const customerId = (data.p as any).customer_id;
      const path = `${customerId}/projects/${id}/${Date.now()}-${file.name}`;
      const up = await supabase.storage.from("documents").upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const existing = data.docs.filter((d: any) => d.doc_type === docType).length;
      const ins = await supabase.from("project_documents").insert({
        project_id: id, doc_type: docType, file_url: path, version: existing + 1, status: "pending",
      });
      if (ins.error) throw ins.error;
      toast.success("Document uploaded");
      qc.invalidateQueries({ queryKey: ["project", id] });
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openDoc = async (path: string) => {
    const { data: signed, error } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 10);
    if (error || !signed) { toast.error(error?.message ?? "Cannot open"); return; }
    window.open(signed.signedUrl, "_blank");
  };

  const deleteDoc = async (docId: string, path: string) => {
    if (!confirm("Delete this document?")) return;
    await supabase.storage.from("documents").remove([path]);
    const { error } = await supabase.from("project_documents").delete().eq("id", docId);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["project", id] });
  };

  if (isLoading || !data?.p) return <div className="text-sm text-slate-500">Loading…</div>;
  const p: any = data.p;
  return (
    <>
      <PageHeader title={p.name} description={`${p.customers?.name ?? "—"} · ${p.location ?? "—"}`} actions={
        <div className="flex items-center gap-3">
          <StatusBadge status={p.status} />
          {canEdit && (
            <Link
              to="/projects/$id/edit"
              params={{ id: p.id }}
              className="h-9 px-3 rounded-md bg-[#1E3A5F] text-white text-sm font-medium hover:bg-[#2D5F8A] inline-flex items-center"
            >Edit project</Link>
          )}
          <EditDeleteBar
            table="projects" id={p.id} row={p} queryKey={["project", id]}
            redirectAfterDelete="/projects"
            fields={[
              { key: "name", label: "Project name" },
              { key: "status", label: "Status", type: "select", options: ["draft","pending","active","completed","rejected"] },
              { key: "project_type", label: "Type" },
              { key: "location", label: "Location" },
              { key: "units", label: "Units", type: "number" },
              { key: "expected_value", label: "Expected value (KES)", type: "number" },
              { key: "start_date", label: "Start date", type: "date" },
              { key: "end_date", label: "End date", type: "date" },
            ]}
          />
        </div>
      } />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2">
          <h3 className="font-semibold text-slate-900 mb-2">Overview</h3>
          {[["Type", p.project_type], ["Units", p.units], ["Expected value", formatKES(p.expected_value)], ["GPS", p.gps_lat && p.gps_lng ? `${p.gps_lat}, ${p.gps_lng}` : "—"], ["Start", formatDate(p.start_date)], ["End", formatDate(p.end_date)]].map(([k, v]) => (
            <div key={k as string} className="text-sm flex justify-between"><span className="text-slate-500">{k}</span><span>{v ?? "—"}</span></div>
          ))}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Milestones</h3>
          {data.milestones.length === 0 ? <p className="text-sm text-slate-500">No milestones defined.</p> :
            data.milestones.map((m: any) => (
              <div key={m.id} className="py-2 border-b border-slate-100 last:border-0">
                <div className="flex justify-between text-sm"><span className="font-medium">{m.name}</span><span className="text-slate-500">{m.target_pct}%</span></div>
                <div className="mt-1 h-2 bg-slate-100 rounded-full"><div className="h-2 bg-[#1E3A5F] rounded-full" style={{ width: `${m.target_pct}%` }} /></div>
              </div>
            ))}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Documents</h3>
          <div className="flex flex-col gap-2 mb-3">
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="h-9 px-2 rounded-md border border-slate-200 text-sm">
              {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <label className={`h-9 px-3 rounded-md border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-600 inline-flex items-center justify-center cursor-pointer ${uploading ? "opacity-50" : "hover:bg-slate-100"}`}>
              {uploading ? "Uploading…" : "Upload file"}
              <input type="file" className="hidden" disabled={uploading} onChange={(e) => {
                const file = e.target.files?.[0]; if (file) uploadFile(file);
                e.target.value = "";
              }} />
            </label>
          </div>
          {data.docs.length === 0 ? <p className="text-sm text-slate-500">No documents uploaded yet.</p> :
            data.docs.map((d: any) => (
              <div key={d.id} className="py-2 border-b border-slate-100 last:border-0 text-sm flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <div className="truncate">{d.doc_type} <span className="text-slate-400">v{d.version}</span></div>
                  <div className="text-xs text-slate-500">{formatDate(d.created_at)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={d.status} />
                  <button onClick={() => openDoc(d.file_url)} className="text-xs text-[#1E3A5F] hover:underline">Open</button>
                  <button onClick={() => deleteDoc(d.id, d.file_url)} className="text-xs text-red-600 hover:underline">Delete</button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
