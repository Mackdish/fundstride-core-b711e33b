import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Plus, PencilLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import {
  getProjectConstructionMilestones,
  saveProjectConstructionMilestone,
} from "@/lib/construction-milestones.functions";

type MilestoneStatus = "planned" | "in_progress" | "completed" | "at_risk" | "delayed";

const statusLabels: Record<MilestoneStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  completed: "Completed",
  at_risk: "At risk",
  delayed: "Delayed",
};

const blankForm = {
  milestone_id: undefined as string | undefined,
  title: "",
  description: "",
  target_date: "",
  status: "planned" as MilestoneStatus,
  visibility: "draft" as "draft" | "published",
  sequence: "0",
};

export function ConstructionMilestones({
  projectId,
  editable = false,
}: {
  projectId: string;
  editable?: boolean;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(blankForm);
  const [formOpen, setFormOpen] = useState(false);
  const queryKey = ["construction-milestones", projectId];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (editable) return getProjectConstructionMilestones({ data: { project_id: projectId } });
      const { data: milestones, error: queryError } = await (supabase as any)
        .from("project_construction_milestones")
        .select("*")
        .eq("project_id", projectId)
        .eq("visibility", "published")
        .order("sequence", { ascending: true })
        .order("target_date", { ascending: true });
      if (queryError) throw queryError;
      return { milestones: milestones ?? [] };
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => saveProjectConstructionMilestone({
      data: {
        project_id: projectId,
        ...(form.milestone_id ? { milestone_id: form.milestone_id } : {}),
        title: form.title.trim(),
        description: form.description.trim(),
        target_date: form.target_date || null,
        status: form.status,
        visibility: form.visibility,
        sequence: Number(form.sequence) || 0,
      },
    }),
    onSuccess: async () => {
      toast.success(form.visibility === "published" ? "Milestone published" : "Milestone saved as draft");
      setForm(blankForm);
      setFormOpen(false);
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: ["portal"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Unable to save milestone"),
  });

  function edit(milestone: any) {
    setForm({
      milestone_id: milestone.id,
      title: milestone.title ?? "",
      description: milestone.description ?? "",
      target_date: milestone.target_date ?? "",
      status: milestone.status ?? "planned",
      visibility: milestone.visibility ?? "draft",
      sequence: String(milestone.sequence ?? 0),
    });
    setFormOpen(true);
  }

  const milestones = data?.milestones ?? [];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Construction milestones
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {editable ? "Manage the construction timeline and publish milestones to the customer portal." : "Published construction milestones and target dates for this project."}
          </p>
        </div>
        {editable && (
          <button type="button" onClick={() => { setForm(blankForm); setFormOpen(true); }}
            className="h-9 px-3 rounded-md bg-[#1E3A5F] text-white text-sm inline-flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" /> Add milestone
          </button>
        )}
      </div>

      {editable && formOpen && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-medium text-slate-900">{form.milestone_id ? "Edit milestone" : "New milestone"}</h4>
            <button type="button" onClick={() => { setForm(blankForm); setFormOpen(false); }}
              className="text-sm text-slate-500">Cancel</button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm text-slate-700 sm:col-span-2">
              Milestone title
              <input value={form.title} maxLength={160} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Complete ground-floor walling"
                className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3" />
            </label>
            <label className="text-sm text-slate-700 sm:col-span-2">
              Description
              <textarea value={form.description} maxLength={3000} rows={2}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-200 bg-white p-3" />
            </label>
            <label className="text-sm text-slate-700">
              Target date
              <input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3" />
            </label>
            <label className="text-sm text-slate-700">
              Status
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MilestoneStatus })}
                className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3">
                <option value="planned">Planned</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="at_risk">At risk</option>
                <option value="delayed">Delayed</option>
              </select>
            </label>
            <label className="text-sm text-slate-700">
              Display order
              <input type="number" min="0" max="10000" step="1" value={form.sequence}
                onChange={(e) => setForm({ ...form, sequence: e.target.value })}
                className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3" />
            </label>
            <label className="text-sm text-slate-700">
              Visibility
              <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as "draft" | "published" })}
                className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3">
                <option value="draft">Draft — staff only</option>
                <option value="published">Published — visible to customer</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end">
            <button type="button" disabled={saveMutation.isPending || !form.title.trim()}
              onClick={() => saveMutation.mutate()}
              className="h-10 rounded-md bg-[#1E3A5F] px-4 text-sm font-medium text-white disabled:opacity-50">
              {saveMutation.isPending ? "Saving…" : "Save milestone"}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading milestones…</p>
      ) : error ? (
        <p className="text-sm text-red-600">Unable to load construction milestones.</p>
      ) : milestones.length === 0 ? (
        <p className="text-sm text-slate-500">{editable ? "No construction milestones yet." : "No published construction milestones yet."}</p>
      ) : (
        <ol className="space-y-3">
          {milestones.map((milestone: any, index: number) => (
            <li key={milestone.id} className="relative rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                      {index + 1}
                    </span>
                    <h4 className="font-medium text-slate-900">{milestone.title}</h4>
                  </div>
                  {milestone.description && <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{milestone.description}</p>}
                  <p className="mt-2 text-xs text-slate-500">
                    Target: {milestone.target_date ? formatDate(milestone.target_date) : "Not set"}
                    {milestone.status === "completed" && milestone.completed_at ? ` · Completed ${formatDate(milestone.completed_at)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs ${milestone.status === "completed" ? "bg-emerald-50 text-emerald-700" : milestone.status === "delayed" || milestone.status === "at_risk" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
                    {statusLabels[milestone.status as MilestoneStatus] ?? milestone.status}
                  </span>
                  {editable && (
                    <button type="button" onClick={() => edit(milestone)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50">
                      <PencilLine className="h-3.5 w-3.5" /> Edit
                    </button>
                  )}
                </div>
              </div>
              {editable && <p className="mt-2 text-[11px] text-slate-400">{milestone.visibility === "published" ? "Visible to customer" : "Draft — staff only"}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
