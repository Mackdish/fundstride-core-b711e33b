-- 1. Add platform_admin role (cross-tenant; can create companies)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_admin';

-- 2. Sales Lead Register
CREATE TABLE public.sales_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id),
  name text NOT NULL,
  contact text,
  location text,
  product text NOT NULL CHECK (product IN ('Design Works','Construction','Construction Financing')),
  status text NOT NULL DEFAULT 'Discussion' CHECK (status IN ('Discussion','Pending','Closed','Deferred')),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sales_leads_tenant_idx ON public.sales_leads(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_leads TO authenticated;
GRANT ALL ON public.sales_leads TO service_role;

ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff manage leads" ON public.sales_leads
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()) AND tenant_id = public.current_tenant_id())
  WITH CHECK (public.is_staff(auth.uid()) AND tenant_id = public.current_tenant_id());

CREATE TRIGGER sales_leads_updated_at
  BEFORE UPDATE ON public.sales_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
