import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertMilestoneStaff(userId: string) {
  const admin = await getAdmin();
  const { data: profile, error: profileError } = await admin
    .from("profiles").select("tenant_id,status").eq("id", userId).maybeSingle();
  if (profileError || !profile?.tenant_id || profile.status !== "active") {
    throw new Error("Forbidden: active staff account and tenant required");
  }
  const { data: roles, error: rolesError } = await admin
    .from("user_roles").select("role").eq("user_id", userId).eq("tenant_id", profile.tenant_id);
  if (rolesError) throw new Error("Unable to verify staff permissions");
  const allowed = new Set([
    "super_admin", "platform_admin", "admin", "executive", "operations",
    "projects", "site_monitoring_officer", "operations_officer", "credit_officer",
  ]);
  if (!(roles ?? []).some((row: any) => allowed.has(row.role))) {
    throw new Error("Forbidden: you cannot manage construction milestones");
  }
  return { admin, tenantId: profile.tenant_id as string };
}

function milestoneSnapshot(row: any) {
  return {
    title: row.title,
    description: row.description,
    target_date: row.target_date,
    status: row.status,
    visibility: row.visibility,
    sequence: row.sequence,
    completed_at: row.completed_at,
  };
}

export const getProjectConstructionMilestones = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ project_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { admin, tenantId } = await assertMilestoneStaff(context.userId);
    const { data: project, error: projectError } = await admin.from("projects")
      .select("id,tenant_id").eq("id", data.project_id).maybeSingle();
    if (projectError || !project || project.tenant_id !== tenantId) {
      throw new Error("Project not found in your company");
    }
    const { data: milestones, error } = await (admin as any)
      .from("project_construction_milestones")
      .select("*")
      .eq("project_id", data.project_id)
      .eq("tenant_id", tenantId)
      .order("sequence", { ascending: true })
      .order("target_date", { ascending: true });
    if (error) throw new Error("Unable to load construction milestones");
    return { milestones: milestones ?? [] };
  });

export const saveProjectConstructionMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    project_id: z.string().uuid(),
    milestone_id: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(160),
    description: z.string().max(3000).default(""),
    target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
    status: z.enum(["planned", "in_progress", "completed", "at_risk", "delayed"]),
    visibility: z.enum(["draft", "published"]),
    sequence: z.number().int().min(0).max(10000).default(0),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { admin, tenantId } = await assertMilestoneStaff(context.userId);
    const { data: project, error: projectError } = await admin.from("projects")
      .select("id,tenant_id").eq("id", data.project_id).maybeSingle();
    if (projectError || !project || project.tenant_id !== tenantId) {
      throw new Error("Project not found in your company");
    }

    const now = new Date().toISOString();
    const values = {
      project_id: data.project_id,
      tenant_id: tenantId,
      title: data.title.trim(),
      description: data.description.trim(),
      target_date: data.target_date,
      status: data.status,
      visibility: data.visibility,
      sequence: data.sequence,
      updated_by: context.userId,
      updated_at: now,
    };

    let saved: any;
    let previous: any = null;
    if (data.milestone_id) {
      const { data: existing, error: existingError } = await (admin as any)
        .from("project_construction_milestones")
        .select("*")
        .eq("id", data.milestone_id)
        .eq("project_id", data.project_id)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (existingError || !existing) throw new Error("Milestone not found");
      previous = existing;
      const { data: updated, error } = await (admin as any)
        .from("project_construction_milestones")
        .update(values)
        .eq("id", data.milestone_id)
        .eq("tenant_id", tenantId)
        .select("*")
        .single();
      if (error || !updated) throw new Error("Unable to update milestone");
      saved = updated;
    } else {
      const { data: inserted, error } = await (admin as any)
        .from("project_construction_milestones")
        .insert({ ...values, created_by: context.userId })
        .select("*")
        .single();
      if (error || !inserted) throw new Error("Unable to create milestone");
      saved = inserted;
    }

    const { error: historyError } = await (admin as any)
      .from("project_construction_milestone_history")
      .insert({
        milestone_id: saved.id,
        project_id: saved.project_id,
        tenant_id: tenantId,
        actor_id: context.userId,
        old_value: previous ? milestoneSnapshot(previous) : null,
        new_value: milestoneSnapshot(saved),
      });
    if (historyError) {
      if (previous) {
        await (admin as any).from("project_construction_milestones").update({
          title: previous.title,
          description: previous.description,
          target_date: previous.target_date,
          status: previous.status,
          visibility: previous.visibility,
          sequence: previous.sequence,
          completed_at: previous.completed_at,
          updated_by: previous.updated_by,
          updated_at: previous.updated_at,
        }).eq("id", saved.id).eq("tenant_id", tenantId);
      } else {
        await (admin as any).from("project_construction_milestones")
          .delete().eq("id", saved.id).eq("tenant_id", tenantId);
      }
      throw new Error("Milestone was not saved because its history record failed. Please retry.");
    }
    return { ok: true, milestone: saved };
  });
