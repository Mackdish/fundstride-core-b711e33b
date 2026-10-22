-- Module 2: progress updates, controlled publication, and immutable revision history.
-- Writes are performed by authenticated server functions using the server-only
-- Supabase admin client; browser clients receive read-only table privileges.

CREATE TABLE IF NOT EXISTS public.project_progress_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  progress_percent numeric(5,2) NOT NULL DEFAULT 0
    CHECK (progress_percent >= 0 AND progress_percent <= 100),
  stage text NOT NULL CHECK (length(trim(stage)) BETWEEN 1 AND 120),
  status text NOT NULL DEFAULT 'on_track'
    CHECK (status IN ('on_track', 'at_risk', 'delayed', 'completed')),
  observations text NOT NULL DEFAULT '',
  next_steps text NOT NULL DEFAULT '',
  publication_status text NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft', 'published')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_progress_published_metadata_check CHECK (
    (publication_status = 'draft' AND published_at IS NULL AND published_by IS NULL)
    OR
    (publication_status = 'published' AND published_at IS NOT NULL AND published_by IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS project_progress_updates_project_timeline_idx
  ON public.project_progress_updates (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS project_progress_updates_customer_published_idx
  ON public.project_progress_updates (tenant_id, project_id, published_at DESC)
  WHERE publication_status = 'published';

ALTER TABLE public.project_progress_updates ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.project_progress_updates TO authenticated;
GRANT ALL ON public.project_progress_updates TO service_role;

CREATE OR REPLACE FUNCTION public.set_project_progress_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_tenant uuid;
BEGIN
  SELECT p.tenant_id INTO project_tenant
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  IF project_tenant IS NULL THEN
    RAISE EXCEPTION 'Project not found or has no tenant';
  END IF;

  NEW.tenant_id := project_tenant;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_progress_updates_set_tenant
  ON public.project_progress_updates;
CREATE TRIGGER project_progress_updates_set_tenant
  BEFORE INSERT OR UPDATE OF project_id, tenant_id
  ON public.project_progress_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_project_progress_tenant();

REVOKE EXECUTE ON FUNCTION public.set_project_progress_tenant()
  FROM PUBLIC, anon, authenticated;


-- Explicit role helper keeps progress access consistent with the app's role aliases.
CREATE OR REPLACE FUNCTION public.can_manage_project_progress(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_roles r ON r.user_id = p.id
    WHERE p.id = _user_id
      AND p.tenant_id = _tenant_id
      AND p.status = 'active'
      AND r.tenant_id = _tenant_id
      AND r.role IN (
        'super_admin', 'platform_admin', 'admin', 'executive',
        'operations', 'projects', 'site_monitoring_officer',
        'operations_officer', 'credit_officer'
      )
  )
$;

REVOKE EXECUTE ON FUNCTION public.can_manage_project_progress(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_project_progress(uuid, uuid)
  TO authenticated;

DROP POLICY IF EXISTS "Staff read project progress" ON public.project_progress_updates;
CREATE POLICY "Staff read project progress"
  ON public.project_progress_updates
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.can_manage_project_progress(auth.uid(), tenant_id)
  );

DROP POLICY IF EXISTS "Customers read published project progress" ON public.project_progress_updates;
CREATE POLICY "Customers read published project progress"
  ON public.project_progress_updates
  FOR SELECT TO authenticated
  USING (
    publication_status = 'published'
    AND tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      LEFT JOIN public.customers c ON c.id = p.customer_id
      WHERE p.id = project_progress_updates.project_id
        AND p.tenant_id = public.current_tenant_id()
        AND (
          c.owner_user_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.customer_project_access access
            WHERE access.project_id = p.id
              AND access.user_id = auth.uid()
              AND access.tenant_id = public.current_tenant_id()
              AND access.revoked_at IS NULL
          )
        )
    )
  );

CREATE TABLE IF NOT EXISTS public.project_progress_update_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_update_id uuid NOT NULL REFERENCES public.project_progress_updates(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'published', 'republished')),
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_progress_history_timeline_idx
  ON public.project_progress_update_history (progress_update_id, created_at DESC);

ALTER TABLE public.project_progress_update_history ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.project_progress_update_history TO authenticated;
GRANT ALL ON public.project_progress_update_history TO service_role;

DROP POLICY IF EXISTS "Staff read project progress history" ON public.project_progress_update_history;
CREATE POLICY "Staff read project progress history"
  ON public.project_progress_update_history
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.can_manage_project_progress(auth.uid(), tenant_id)
  );

-- Deliberately no INSERT/UPDATE/DELETE policies for authenticated clients:
-- history is written only by trusted server-side code.
