-- Module 6: explicit customer-contribution records for project financial summaries.
-- Existing facilities, drawdowns, payments, and repayments remain the source of truth
-- for financing and payment history; this table adds the missing contribution ledger.

CREATE TABLE IF NOT EXISTS public.project_customer_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  contribution_date date NOT NULL DEFAULT current_date,
  method text NOT NULL DEFAULT 'other'
    CHECK (method IN ('cash', 'bank_transfer', 'mobile_money', 'cheque', 'other')),
  reference text,
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'rejected')),
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_customer_contributions_project_date_idx
  ON public.project_customer_contributions (project_id, contribution_date DESC);

ALTER TABLE public.project_customer_contributions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.project_customer_contributions TO authenticated;
GRANT ALL ON public.project_customer_contributions TO service_role;

CREATE OR REPLACE FUNCTION public.set_project_contribution_scope()
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

DROP TRIGGER IF EXISTS project_customer_contributions_set_scope
  ON public.project_customer_contributions;
CREATE TRIGGER project_customer_contributions_set_scope
  BEFORE INSERT OR UPDATE OF project_id, tenant_id
  ON public.project_customer_contributions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_project_contribution_scope();

REVOKE EXECUTE ON FUNCTION public.set_project_contribution_scope()
  FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Staff read project contributions" ON public.project_customer_contributions;
CREATE POLICY "Staff read project contributions"
  ON public.project_customer_contributions
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.is_staff(auth.uid())
  );

DROP POLICY IF EXISTS "Customers read confirmed own project contributions" ON public.project_customer_contributions;
CREATE POLICY "Customers read confirmed own project contributions"
  ON public.project_customer_contributions
  FOR SELECT TO authenticated
  USING (
    status = 'confirmed'
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
      JOIN public.customers c ON c.id = p.customer_id
      WHERE p.id = project_customer_contributions.project_id
        AND p.tenant_id = public.current_tenant_id()
        AND c.owner_user_id = auth.uid()
    )
  );

-- No client INSERT/UPDATE/DELETE policy: finance changes go through validated server functions.
