import { supabase } from "@/integrations/supabase/client";

export async function logAudit(
  action: string,
  entityType: string,
  entityId?: string | null,
  oldValue?: unknown,
  newValue?: unknown,
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    old_value: (oldValue as any) ?? null,
    new_value: (newValue as any) ?? null,
  });
}
