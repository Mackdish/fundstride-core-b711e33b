-- Module 4: customer-facing construction milestones, separate from financing milestones.

CREATE TABLE IF NOT EXISTS public.project_construction_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 3000),
  target_date date,
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'completed', 'at_risk', 'delayed')),
  visibility text NOT NULL DEFAULT 'draft'
    CHECK (visibility IN ('draft', 'published')),
  sequence integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_construction_milestones_timeline_idx
  ON public.project_construction_milestones (project_id, sequence, target_date);

ALTER TABLE public.project_construction_milestones ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.project_construction_milestones TO authenticated;
GRANT ALL ON public.project_construction_milestones TO service_role;

CREATE OR REPLACE FUNCTION public.set_construction_milestone_scope()
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
  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  ELSIF NEW.status <> 'completed' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_construction_milestones_set_scope
  ON public.project_construction_milestones;
CREATE TRIGGER project_construction_milestones_set_scope
  BEFORE INSERT OR UPDATE OF project_id, tenant_id, status
  ON public.project_construction_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.set_construction_milestone_scope();

REVOKE EXECUTE ON FUNCTION public.set_construction_milestone_scope()
  FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Staff read construction milestones" ON public.project_construction_milestones;
CREATE POLICY "Staff read construction milestones"
  ON public.project_construction_milestones
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.can_manage_project_progress(auth.uid(), tenant_id)
  );

DROP POLICY IF EXISTS "Customers read published construction milestones" ON public.project_construction_milestones;
CREATE POLICY "Customers read published construction milestones"
  ON public.project_construction_milestones
  FOR SELECT TO authenticated
  USING (
    visibility = 'published'
    AND tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles customer_role
      WHERE customer_role.user_id = auth.uid()
        AND customer_role.tenant_id = public.current_tenant_id()
        AND customer_role.role = 'customer'
    )
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      LEFT JOIN public.customers c ON c.id = p.customer_id
      WHERE p.id = project_construction_milestones.project_id
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

CREATE TABLE IF NOT EXISTS public.project_construction_milestone_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES public.project_construction_milestones(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  old_value jsonb,
  new_value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_construction_milestone_history_idx
  ON public.project_construction_milestone_history (milestone_id, created_at DESC);

ALTER TABLE public.project_construction_milestone_history ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.project_construction_milestone_history TO authenticated;
GRANT ALL ON public.project_construction_milestone_history TO service_role;

DROP POLICY IF EXISTS "Staff read construction milestone history" ON public.project_construction_milestone_history;
CREATE POLICY "Staff read construction milestone history"
  ON public.project_construction_milestone_history
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.can_manage_project_progress(auth.uid(), tenant_id)
  );

-- Milestone writes and history writes are restricted to trusted server functions.
