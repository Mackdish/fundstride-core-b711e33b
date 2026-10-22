-- Module 1: customer portal access, invitations, and explicit project grants.
-- Additive only: preserves existing customer/project records and the owner_user_id model.

CREATE TABLE IF NOT EXISTS public.customer_project_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT customer_project_access_project_user_key UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS customer_project_access_user_active_idx
  ON public.customer_project_access (user_id, tenant_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS customer_project_access_project_active_idx
  ON public.customer_project_access (project_id)
  WHERE revoked_at IS NULL;

ALTER TABLE public.customer_project_access ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_project_access TO authenticated;
GRANT ALL ON public.customer_project_access TO service_role;

-- Always derive tenant ownership from the project. A client cannot assign a
-- project grant to a different tenant or grant access across tenant boundaries.
CREATE OR REPLACE FUNCTION public.set_customer_project_access_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_tenant uuid;
  user_tenant uuid;
BEGIN
  SELECT p.tenant_id INTO project_tenant
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  IF project_tenant IS NULL THEN
    RAISE EXCEPTION 'Project not found or has no tenant';
  END IF;

  SELECT pr.tenant_id INTO user_tenant
  FROM public.profiles pr
  WHERE pr.id = NEW.user_id
    AND pr.status = 'active';

  IF user_tenant IS NULL OR user_tenant <> project_tenant THEN
    RAISE EXCEPTION 'Customer account must be active and belong to the project tenant';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles r
    WHERE r.user_id = NEW.user_id
      AND r.tenant_id = project_tenant
      AND r.role = 'customer'
  ) OR public.is_staff(NEW.user_id) THEN
    RAISE EXCEPTION 'Only customer accounts can be assigned customer project access';
  END IF;

  NEW.tenant_id := project_tenant;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customer_project_access_set_tenant
  ON public.customer_project_access;
CREATE TRIGGER customer_project_access_set_tenant
  BEFORE INSERT OR UPDATE OF project_id, user_id, tenant_id
  ON public.customer_project_access
  FOR EACH ROW
  EXECUTE FUNCTION public.set_customer_project_access_tenant();

REVOKE EXECUTE ON FUNCTION public.set_customer_project_access_tenant()
  FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Staff manage customer project access"
  ON public.customer_project_access;
CREATE POLICY "Staff manage customer project access"
  ON public.customer_project_access
  FOR ALL TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.is_staff(auth.uid())
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.is_staff(auth.uid())
  );

DROP POLICY IF EXISTS "Customers view their project access"
  ON public.customer_project_access;
CREATE POLICY "Customers view their project access"
  ON public.customer_project_access
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND revoked_at IS NULL
    AND tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles customer_role
      WHERE customer_role.user_id = auth.uid()
        AND customer_role.tenant_id = public.current_tenant_id()
        AND customer_role.role = 'customer'
    )
  );

-- Invitation records support staff-managed invitations and account linking.
-- Auth credentials and invitation tokens remain in Supabase Auth; no raw token
-- or password is stored in this table.
CREATE TABLE IF NOT EXISTS public.customer_portal_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  invited_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  accepted_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_portal_invitations_email_nonempty
    CHECK (length(trim(email)) > 3)
);

CREATE INDEX IF NOT EXISTS customer_portal_invitations_tenant_status_idx
  ON public.customer_portal_invitations (tenant_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS customer_portal_invitations_pending_customer_email_idx
  ON public.customer_portal_invitations (customer_id, lower(email))
  WHERE status = 'pending';

ALTER TABLE public.customer_portal_invitations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_portal_invitations TO authenticated;
GRANT ALL ON public.customer_portal_invitations TO service_role;

DROP POLICY IF EXISTS "Staff manage customer portal invitations"
  ON public.customer_portal_invitations;
CREATE POLICY "Staff manage customer portal invitations"
  ON public.customer_portal_invitations
  FOR ALL TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.is_staff(auth.uid())
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.is_staff(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = customer_id
        AND c.tenant_id = customer_portal_invitations.tenant_id
    )
  );

-- Do not allow clients to invoke the trigger helper directly.

-- A specifically assigned customer can read only the project records explicitly
-- granted to them. Existing owner-based policies continue to work unchanged.
DROP POLICY IF EXISTS "Customers view assigned projects" ON public.projects;
CREATE POLICY "Customers view assigned projects"
  ON public.projects
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public.customer_project_access access
      WHERE access.project_id = projects.id
        AND access.user_id = auth.uid()
        AND access.tenant_id = public.current_tenant_id()
        AND access.revoked_at IS NULL
    )
  );
