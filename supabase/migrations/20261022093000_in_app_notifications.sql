-- Module 5: private in-app notifications. Only trusted server code can create notifications.

CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  progress_update_id uuid REFERENCES public.project_progress_updates(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  message text NOT NULL DEFAULT '' CHECK (length(message) <= 2000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT in_app_notifications_progress_recipient_key
    UNIQUE (progress_update_id, user_id, notification_type)
);

CREATE INDEX IF NOT EXISTS in_app_notifications_user_unread_idx
  ON public.in_app_notifications (user_id, tenant_id, created_at DESC)
  WHERE read_at IS NULL;

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.in_app_notifications TO authenticated;
GRANT ALL ON public.in_app_notifications TO service_role;

DROP POLICY IF EXISTS "Users read own in-app notifications" ON public.in_app_notifications;
CREATE POLICY "Users read own in-app notifications"
  ON public.in_app_notifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND tenant_id = public.current_tenant_id()
  );

DROP POLICY IF EXISTS "Users mark own in-app notifications read" ON public.in_app_notifications;
CREATE POLICY "Users mark own in-app notifications read"
  ON public.in_app_notifications
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND tenant_id = public.current_tenant_id()
  )
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id = public.current_tenant_id()
  );

-- No INSERT or DELETE policy is intentionally provided for authenticated users.
