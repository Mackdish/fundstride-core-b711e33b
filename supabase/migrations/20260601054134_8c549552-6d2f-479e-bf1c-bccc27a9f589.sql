CREATE TABLE public.loan_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  default_interest_rate numeric,
  default_tenor_months integer,
  processing_fee_rate numeric,
  insurance_fee_rate numeric,
  max_ltv numeric,
  min_amount numeric,
  max_amount numeric,
  repayment_frequency text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_products TO authenticated;
GRANT ALL ON public.loan_products TO service_role;

ALTER TABLE public.loan_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff manage loan products"
  ON public.loan_products FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.is_staff(auth.uid()))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.is_staff(auth.uid()));

CREATE TRIGGER update_loan_products_updated_at
  BEFORE UPDATE ON public.loan_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
