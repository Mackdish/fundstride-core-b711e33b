-- Tenant-scoped staff authorization for customer/project administration.
CREATE OR REPLACE FUNCTION public.is_tenant_staff(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
        'finance', 'finance_officer', 'credit', 'credit_officer',
        'operations', 'operations_officer', 'projects',
        'site_monitoring_officer', 'risk_compliance_officer', 'sales'
      )
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_tenant_staff(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_tenant_staff(uuid, uuid) TO authenticated;

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
  ) OR public.is_tenant_staff(NEW.user_id, project_tenant) THEN
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
    AND public.is_tenant_staff(auth.uid(), tenant_id)
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.is_tenant_staff(auth.uid(), tenant_id)
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
    AND public.is_tenant_staff(auth.uid(), tenant_id)
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.is_tenant_staff(auth.uid(), tenant_id)
    AND EXISTS (
      SELECT 1
      FROM public.customers c
      WHERE c.id = customer_id
        AND c.tenant_id = customer_portal_invitations.tenant_id
    )
  );

-- Do not allow clients to invoke the trigger helper directly.

-- A specifically assigned customer can read only the project records explicitly
-- granted to them. Legacy owner-based project access is tightened below.
DROP POLICY IF EXISTS "Customers view assigned projects" ON public.projects;
CREATE POLICY "Customers view assigned projects"
  ON public.projects
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles customer_role
      WHERE customer_role.user_id = auth.uid()
        AND customer_role.tenant_id = public.current_tenant_id()
        AND customer_role.role = 'customer'
    )
    AND EXISTS (
      SELECT 1
      FROM public.customer_project_access access
      WHERE access.project_id = projects.id
        AND access.user_id = auth.uid()
        AND access.tenant_id = public.current_tenant_id()
        AND access.revoked_at IS NULL
    )
  );


-- Tighten the legacy project policies so customer accounts are read-only and
-- lose owner-based project access when their customer role is removed.
DROP POLICY IF EXISTS "View projects" ON public.projects;
CREATE POLICY "View projects"
  ON public.projects
  FOR SELECT TO authenticated
  USING (
    (
      public.is_tenant_staff(auth.uid(), tenant_id)
      AND tenant_id = public.current_tenant_id()
    )
    OR (
      public.has_role(auth.uid(), 'customer'::public.app_role)
      AND tenant_id = public.current_tenant_id()
      AND EXISTS (
        SELECT 1
        FROM public.customers c
        WHERE c.id = projects.customer_id
          AND c.owner_user_id = auth.uid()
          AND c.tenant_id = public.current_tenant_id()
      )
    )
  );

DROP POLICY IF EXISTS "Manage projects" ON public.projects;
CREATE POLICY "Manage projects"
  ON public.projects
  FOR ALL TO authenticated
  USING (
    public.is_tenant_staff(auth.uid(), tenant_id)
    AND tenant_id = public.current_tenant_id()
  )
  WITH CHECK (
    public.is_tenant_staff(auth.uid(), tenant_id)
    AND tenant_id = public.current_tenant_id()
  );
