import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EditDeleteBar } from "@/components/EditDeleteBar";
import { supabase } from "@/integrations/supabase/client";
import { formatKES, formatDate } from "@/lib/format";

export const Route = createFileRoute("/projects/$id")({
  component: () => <ProtectedRoute><ProjectDetail /></ProtectedRoute>,
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const [p, ms, docs] = await Promise.all([
        supabase.from("projects").select("*, customers(name)").eq("id", id).single(),
        supabase.from("milestones").select("*").eq("project_id", id).order("sequence"),
        supabase.from("project_documents").select("*").eq("project_id", id),
      ]);
      return { p: p.data, milestones: ms.data ?? [], docs: docs.data ?? [] };
    },
  });

  if (isLoading || !data?.p) return <div className="text-sm text-slate-500">Loading…</div>;
  const p: any = data.p;
  return (
    <>
      <PageHeader title={p.name} description={`${p.customers?.name ?? "—"} · ${p.location ?? "—"}`} actions={
        <div className="flex items-center gap-3">
          <StatusBadge status={p.status} />
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
          {data.docs.length === 0 ? <p className="text-sm text-slate-500">No documents uploaded yet.</p> :
            data.docs.map((d: any) => (
              <div key={d.id} className="py-2 border-b border-slate-100 last:border-0 text-sm flex justify-between">
                <span>{d.doc_type} v{d.version}</span><StatusBadge status={d.status} />
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
