import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const PROGRESS_STAFF_ROLES = new Set([
  "super_admin", "admin", "executive", "operations", "projects",
  "site_monitoring_officer", "operations_officer", "credit_officer",
]);

async function assertProgressStaff(userId: string) {
  const admin = await getAdmin();
  const { data: profile, error: profileError } = await admin
    .from("profiles").select("tenant_id,status").eq("id", userId).maybeSingle();
  if (profileError || !profile?.tenant_id || profile.status !== "active") {
    throw new Error("Forbidden: active staff account and tenant required");
  }
  const { data: roles, error: roleError } = await admin
    .from("user_roles").select("role").eq("user_id", userId).eq("tenant_id", profile.tenant_id);
  if (roleError) throw new Error("Unable to verify staff permissions");
  if (!(roles ?? []).some((row: { role: string }) => PROGRESS_STAFF_ROLES.has(row.role))) {
    throw new Error("Forbidden: you do not have permission to publish project progress");
  }
  return { admin, tenantId: profile.tenant_id as string };
}

const progressInput = z.object({
  project_id: z.string().uuid(),
  progress_percent: z.number().min(0).max(100),
  stage: z.string().trim().min(1).max(120),
  status: z.enum(["on_track", "at_risk", "delayed", "completed"]),
  observations: z.string().max(10000).default(""),
  next_steps: z.string().max(5000).default(""),
  action: z.enum(["draft", "publish"]),
  update_id: z.string().uuid().optional(),
});

function snapshot(row: any) {
  return {
    project_id: row.project_id,
    progress_percent: row.progress_percent,
    stage: row.stage,
    status: row.status,
    observations: row.observations,
    next_steps: row.next_steps,
    publication_status: row.publication_status,
    published_by: row.published_by,
    published_at: row.published_at,
    version: row.version,
  };
}

export const getProjectProgressUpdates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ project_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { admin, tenantId } = await assertProgressStaff(context.userId);
    const { data: project, error: projectError } = await admin.from("projects")
      .select("id,tenant_id").eq("id", data.project_id).maybeSingle();
    if (projectError || !project || project.tenant_id !== tenantId) {
      throw new Error("Project not found in your company");
    }
    const { data: updates, error } = await (admin as any).from("project_progress_updates")
      .select("*")
      .eq("project_id", data.project_id)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (error) throw new Error("Unable to load progress updates");
    return { updates: updates ?? [] };
  });

export const saveProjectProgressUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => progressInput.parse(input))
  .handler(async ({ data, context }) => {
    const { admin, tenantId } = await assertProgressStaff(context.userId);
    const { data: project, error: projectError } = await admin.from("projects")
      .select("id,tenant_id").eq("id", data.project_id).maybeSingle();
    if (projectError || !project || project.tenant_id !== tenantId) {
      throw new Error("Project not found in your company");
    }

    const now = new Date().toISOString();
    const publish = data.action === "publish";
    const values = {
      project_id: data.project_id,
      tenant_id: tenantId,
      progress_percent: data.progress_percent,
      stage: data.stage,
      status: data.status,
      observations: data.observations,
      next_steps: data.next_steps,
      publication_status: publish ? "published" : "draft",
      updated_by: context.userId,
      updated_at: now,
      published_by: publish ? context.userId : null,
      published_at: publish ? now : null,
    };

    let saved: any;
    let oldValue: any = null;
    let historyAction: "created" | "updated" | "published" = publish ? "published" : "created";

    if (data.update_id) {
      const { data: existing, error: existingError } = await (admin as any)
        .from("project_progress_updates")
        .select("*")
        .eq("id", data.update_id)
        .eq("project_id", data.project_id)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (existingError) throw new Error("Unable to verify the progress update");
      if (!existing) throw new Error("Progress update not found");
      if (existing.publication_status === "published") {
        throw new Error("Published updates are immutable. Create a new correction update instead.");
      }
      oldValue = snapshot(existing);
      historyAction = publish ? "published" : "updated";
      const { data: updated, error } = await (admin as any)
        .from("project_progress_updates")
        .update({
          ...values,
          created_by: existing.created_by,
          version: Number(existing.version ?? 1) + 1,
        })
        .eq("id", data.update_id)
        .eq("project_id", data.project_id)
        .eq("tenant_id", tenantId)
        .select("*")
        .single();
      if (error || !updated) throw new Error("Unable to save the progress update");
      saved = updated;
    } else {
      const { data: inserted, error } = await (admin as any)
        .from("project_progress_updates")
        .insert({
          ...values,
          created_by: context.userId,
          version: 1,
        })
        .select("*")
        .single();
      if (error || !inserted) throw new Error("Unable to create the progress update");
      saved = inserted;
    }

    const { error: historyError } = await (admin as any)
      .from("project_progress_update_history")
      .insert({
        progress_update_id: saved.id,
        project_id: saved.project_id,
        tenant_id: tenantId,
        actor_id: context.userId,
        action: historyAction,
        old_value: oldValue,
        new_value: snapshot(saved),
      });
    if (historyError) {
      // Do not claim a successful publish when its audit record was not saved.
      // The saved row remains visible to staff and can be reviewed/retried.
      throw new Error("Progress was saved, but its audit record failed. Do not retry blindly; refresh the project and contact an administrator.");
    }

    return { ok: true, update: saved };
  });
