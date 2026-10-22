import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowUpRight, Plus } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/progress/")({
  component: () => (
    <ProtectedRoute roles={[
      "super_admin", "admin", "executive", "operations", "projects",
      "site_monitoring_officer", "operations_officer", "credit_officer",
    ]}>
      <ProgressOverview />
    </ProtectedRoute>
  ),
});

function ProgressOverview() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["progress-overview"],
    queryFn: async () => {
      const { data: projects, error: projectError } = await (supabase as any)
        .from("projects")
        .select("id,name,location,status,customer_id,customers(name)")
        .order("created_at", { ascending: false });
      if (projectError) throw projectError;

      const projectIds = (projects ?? []).map((project: any) => project.id);
      const { data: updates, error: updatesError } = projectIds.length
        ? await (supabase as any).from("project_progress_updates")
            .select("id,project_id,progress_percent,stage,status,publication_status,published_at,updated_at,created_at")
            .in("project_id", projectIds)
            .order("created_at", { ascending: false })
        : { data: [], error: null };
      if (updatesError) throw updatesError;

      const latestByProject = new Map<string, any>();
      for (const update of updates ?? []) {
        if (!latestByProject.has(update.project_id)) latestByProject.set(update.project_id, update);
      }
      return { projects: projects ?? [], latestByProject };
    },
  });

  const projects = data?.projects ?? [];

  return (
    <>
      <PageHeader
        title="Construction progress"
        description="Monitor project updates, identify delayed work, and publish customer-facing progress reports."
        actions={
          <Link to="/projects" className="inline-flex h-9 items-center gap-2 rounded-md bg-[#1E3A5F] px-3 text-sm font-medium text-white">
            <Plus className="h-4 w-4" /> Select project
          </Link>
        }
      />

      {error && <p className="mb-4 text-sm text-red-600">Unable to load the progress overview. Check your permissions and refresh.</p>}
      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <Activity className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 font-semibold text-slate-900">No projects available</h2>
          <p className="mt-1 text-sm text-slate-500">Projects will appear here when they are registered.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Latest stage</th>
                  <th className="px-4 py-3 font-medium">Completion</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Publication</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((project: any) => {
                  const update = data?.latestByProject.get(project.id);
                  return (
                    <tr key={project.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{project.name}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{project.customers?.name ?? "Customer"} · {project.location ?? "Location not set"}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{update?.stage ?? "No update yet"}</td>
                      <td className="px-4 py-3">
                        {update ? (
                          <div className="min-w-28">
                            <div className="mb-1 flex justify-between text-xs">
                              <span>{Number(update.progress_percent)}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-[#1E3A5F]" style={{ width: `${Math.min(100, Math.max(0, Number(update.progress_percent)))}%` }} />
                            </div>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {update ? <span className="capitalize">{String(update.status).replaceAll("_", " ")}</span> : <StatusBadge status={project.status} />}
                      </td>
                      <td className="px-4 py-3">
                        {update ? (
                          <span className={`rounded-full px-2 py-1 text-xs ${update.publication_status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                            {update.publication_status === "published" ? "Published" : "Draft"}
                          </span>
                        ) : <span className="text-xs text-slate-400">Not started</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{update ? formatDate(update.published_at ?? update.updated_at ?? update.created_at) : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Link to="/projects/$id" params={{ id: project.id }} className="inline-flex items-center gap-1 text-xs font-medium text-[#1E3A5F] hover:underline">
                          Open <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
