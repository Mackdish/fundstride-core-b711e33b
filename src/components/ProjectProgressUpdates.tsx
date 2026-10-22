import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FilePlus2, PencilLine, Send } from "lucide-react";
import { formatDate } from "@/lib/format";
import { getProjectProgressUpdates, saveProjectProgressUpdate } from "@/lib/project-progress.functions";

type ProgressStatus = "on_track" | "at_risk" | "delayed" | "completed";
type PublicationAction = "draft" | "publish";

const emptyForm = {
  update_id: undefined as string | undefined,
  progress_percent: "0",
  stage: "",
  status: "on_track" as ProgressStatus,
  observations: "",
  next_steps: "",
};

const statusLabels: Record<ProgressStatus, string> = {
  on_track: "On track",
  at_risk: "At risk",
  delayed: "Delayed",
  completed: "Completed",
};

export function ProjectProgressUpdates({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const queryKey = ["project-progress-updates", projectId];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => getProjectProgressUpdates({ data: { project_id: projectId } }),
  });

  const saveMutation = useMutation({
    mutationFn: (action: PublicationAction) => saveProjectProgressUpdate({
      data: {
        project_id: projectId,
        ...(form.update_id ? { update_id: form.update_id } : {}),
        progress_percent: Number(form.progress_percent),
        stage: form.stage.trim(),
        status: form.status,
        observations: form.observations.trim(),
        next_steps: form.next_steps.trim(),
        action,
      },
    }),
    onSuccess: async (_result, action) => {
      toast.success(action === "publish" ? "Progress update published" : "Draft saved");
      setForm(emptyForm);
      setFormOpen(false);
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: ["portal"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Unable to save progress update"),
  });

  const updates = data?.updates ?? [];

  function editDraft(update: any) {
    setForm({
      update_id: update.id,
      progress_percent: String(update.progress_percent ?? 0),
      stage: update.stage ?? "",
      status: update.status ?? "on_track",
      observations: update.observations ?? "",
      next_steps: update.next_steps ?? "",
    });
    setFormOpen(true);
  }

  function startNew() {
    setForm(emptyForm);
    setFormOpen(true);
  }

  function save(action: PublicationAction) {
    const percent = Number(form.progress_percent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      toast.error("Progress must be between 0 and 100.");
      return;
    }
    if (!form.stage.trim()) {
      toast.error("Enter the current construction stage.");
      return;
    }
    saveMutation.mutate(action);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">Construction progress</h3>
          <p className="text-sm text-slate-500 mt-1">
            Save a private draft or publish directly to the customer portal. Published updates cannot be silently overwritten.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="shrink-0 h-9 px-3 rounded-md bg-[#1E3A5F] text-white text-sm font-medium inline-flex items-center justify-center gap-2"
        >
          <FilePlus2 className="h-4 w-4" />
          New update
        </button>
      </div>

      {formOpen && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-medium text-slate-900">{form.update_id ? "Edit draft" : "New progress update"}</h4>
            <button
              type="button"
              onClick={() => { setForm(emptyForm); setFormOpen(false); }}
              className="text-sm text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="text-sm text-slate-700">
              Completion (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={form.progress_percent}
                onChange={(event) => setForm({ ...form, progress_percent: event.target.value })}
                className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200 bg-white"
              />
            </label>
            <label className="text-sm text-slate-700 sm:col-span-2">
              Current stage
              <input
                value={form.stage}
                maxLength={120}
                onChange={(event) => setForm({ ...form, stage: event.target.value })}
                placeholder="e.g. Walling"
                className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200 bg-white"
              />
            </label>
            <label className="text-sm text-slate-700 sm:col-span-3">
              Project status
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as ProgressStatus })}
                className="mt-1 w-full h-10 px-3 rounded-md border border-slate-200 bg-white"
              >
                <option value="on_track">On track</option>
                <option value="at_risk">At risk</option>
                <option value="delayed">Delayed</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <label className="text-sm text-slate-700 sm:col-span-3">
              Observations
              <textarea
                value={form.observations}
                maxLength={10000}
                onChange={(event) => setForm({ ...form, observations: event.target.value })}
                rows={3}
                placeholder="What was completed or observed on site?"
                className="mt-1 w-full rounded-md border border-slate-200 bg-white p-3"
              />
            </label>
            <label className="text-sm text-slate-700 sm:col-span-3">
              Next steps
              <textarea
                value={form.next_steps}
                maxLength={5000}
                onChange={(event) => setForm({ ...form, next_steps: event.target.value })}
                rows={2}
                placeholder="What happens next?"
                className="mt-1 w-full rounded-md border border-slate-200 bg-white p-3"
              />
            </label>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => save("draft")}
              className="h-10 px-4 rounded-md border border-slate-300 bg-white text-sm font-medium disabled:opacity-50"
            >
              {saveMutation.isPending ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => save("publish")}
              className="h-10 px-4 rounded-md bg-[#1E3A5F] text-white text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {saveMutation.isPending ? "Publishing…" : "Publish update"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">Unable to load progress updates. Refresh the page or check your permissions.</p>}
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading progress updates…</p>
      ) : updates.length === 0 ? (
        <p className="text-sm text-slate-500">No progress updates yet.</p>
      ) : (
        <div className="space-y-3">
          {updates.map((update: any) => (
            <article key={update.id} className="rounded-lg border border-slate-200 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-900">{update.stage}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {formatDate(update.published_at ?? update.updated_at ?? update.created_at)} · Version {update.version}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                    {update.publication_status === "published" ? "Published" : "Draft"}
                  </span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-800">
                    {statusLabels[update.status as ProgressStatus] ?? update.status}
                  </span>
                  {update.publication_status === "draft" && (
                    <button
                      type="button"
                      onClick={() => editDraft(update)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs hover:bg-slate-50"
                    >
                      <PencilLine className="h-3.5 w-3.5" /> Edit draft
                    </button>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Completion</span>
                  <span className="font-semibold text-slate-900">{Number(update.progress_percent)}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-[#1E3A5F]" style={{ width: `${Math.min(100, Math.max(0, Number(update.progress_percent)))}%` }} />
                </div>
              </div>
              {update.observations && <p className="text-sm text-slate-700 whitespace-pre-wrap">{update.observations}</p>}
              {update.next_steps && (
                <p className="text-sm text-slate-600"><span className="font-medium">Next steps:</span> {update.next_steps}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
