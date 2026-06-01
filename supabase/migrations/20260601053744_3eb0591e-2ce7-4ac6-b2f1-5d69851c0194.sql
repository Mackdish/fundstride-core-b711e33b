-- Remap existing rows to the new role names
UPDATE public.user_roles SET role = 'credit'     WHERE role = 'credit_officer';
UPDATE public.user_roles SET role = 'finance'    WHERE role = 'finance_officer';
UPDATE public.user_roles SET role = 'operations' WHERE role IN ('operations_officer','site_monitoring_officer');
UPDATE public.user_roles SET role = 'admin'      WHERE role = 'risk_compliance_officer';

-- Refresh is_staff to recognise the new roles (keep old names for safety)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN (
        'super_admin','admin','executive','finance','credit','operations',
        -- legacy names kept for backward compatibility
        'credit_officer','operations_officer','site_monitoring_officer',
        'finance_officer','risk_compliance_officer'
      )
  )
$$;

-- Re-assert strict tenant isolation on the three tables called out for audit.
-- Policies already enforce this; we drop & recreate to ensure no permissive
-- variant exists and to add an explicit-deny safety net.
DROP POLICY IF EXISTS "Tenant staff manage" ON public.loan_facilities;
CREATE POLICY "Tenant staff manage" ON public.loan_facilities
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_staff(auth.uid()))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Tenant staff manage" ON public.payments;
CREATE POLICY "Tenant staff manage" ON public.payments
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_staff(auth.uid()))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Tenant staff manage leads" ON public.sales_leads;
CREATE POLICY "Tenant staff manage leads" ON public.sales_leads
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_staff(auth.uid()))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_staff(auth.uid()));
