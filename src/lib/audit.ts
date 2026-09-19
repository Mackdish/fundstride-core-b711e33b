import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const auditInput = z.object({
  action: z.string().min(1).max(100),
  entityType: z.string().min(1).max(100),
  entityId: z.string().uuid().nullable().optional(),
  oldValue: z.unknown().nullable().optional(),
  newValue: z.unknown().nullable().optional(),
});

const writeAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => auditInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .maybeSingle();

    if (profileError || !profile?.tenant_id) {
      throw new Error("Unable to determine audit tenant");
    }

    const { error } = await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      tenant_id: profile.tenant_id,
      action: data.action,
      entity_type: data.entityType,
      entity_id: data.entityId ?? null,
      old_value: data.oldValue ?? null,
      new_value: data.newValue ?? null,
    });

    if (error) {
      console.error("[Audit] Failed to write audit event:", error.message);
      throw new Error("Unable to record audit event");
    }

    return { ok: true };
  });

export async function logAudit(
  action: string,
  entityType: string,
  entityId?: string | null,
  oldValue?: unknown,
  newValue?: unknown,
) {
  await writeAudit({
    data: {
      action,
      entityType,
      entityId: entityId ?? null,
      oldValue: oldValue ?? null,
      newValue: newValue ?? null,
    },
  });
}
