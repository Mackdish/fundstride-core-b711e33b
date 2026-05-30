
-- =========================================================
-- 1. TENANTS
-- =========================================================
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  currency text NOT NULL DEFAULT 'KSh',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, UPDATE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

INSERT INTO public.tenants (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001','Kinetic Investment Ventures','kinetic')
ON CONFLICT DO NOTHING;

-- =========================================================
-- 2. PROFILES.tenant_id + helper (must exist before defaults)
-- =========================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.profiles SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
ALTER TABLE public.profiles ALTER COLUMN tenant_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT tenant_id FROM public.profiles WHERE id = auth.uid() $$;

CREATE POLICY "View own tenant" ON public.tenants FOR SELECT TO authenticated
  USING (id = public.current_tenant_id());
CREATE POLICY "Super admin update tenant" ON public.tenants FOR UPDATE TO authenticated
  USING (id = public.current_tenant_id() AND has_role(auth.uid(),'super_admin'))
  WITH CHECK (id = public.current_tenant_id());

-- =========================================================
-- 3. Add tenant_id to every domain table + backfill + default
-- =========================================================
DO $mig$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'appraisals','approval_conditions','audit_logs','beneficiaries',
    'contractor_contracts','contractor_scores','contractors','covenants',
    'credit_monitoring_reports','customer_directors','customer_documents',
    'customers','drawdown_requests','ifrs9_indicators','issues',
    'ledger_entries','loan_facilities','milestones','payments',
    'project_documents','projects','repayment_schedules','repayments',
    'risk_alerts','risk_scores','site_media','site_visits','user_roles'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id)', t);
    EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', t, '00000000-0000-0000-0000-000000000001');
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.current_tenant_id()', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(tenant_id)', t||'_tenant_idx', t);
  END LOOP;
END$mig$;

-- =========================================================
-- 4. Drop all existing policies on these tables, recreate tenant-scoped
-- =========================================================
DO $pol$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN (
        'appraisals','approval_conditions','audit_logs','beneficiaries',
        'contractor_contracts','contractor_scores','contractors','covenants',
        'credit_monitoring_reports','customer_directors','customer_documents',
        'customers','drawdown_requests','ifrs9_indicators','issues',
        'ledger_entries','loan_facilities','milestones','payments',
        'project_documents','projects','repayment_schedules','repayments',
        'risk_alerts','risk_scores','site_media','site_visits','user_roles','profiles'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END$pol$;

-- Simple "staff in tenant" tables
DO $simple$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'appraisals','approval_conditions','beneficiaries','contractor_contracts',
    'contractor_scores','covenants','credit_monitoring_reports','drawdown_requests',
    'ifrs9_indicators','issues','ledger_entries','loan_facilities','milestones',
    'payments','project_documents','repayment_schedules','repayments',
    'risk_alerts','risk_scores','site_media','site_visits'
  ] LOOP
    EXECUTE format($p$CREATE POLICY "Tenant staff manage" ON public.%I FOR ALL TO authenticated
      USING (is_staff(auth.uid()) AND tenant_id = public.current_tenant_id())
      WITH CHECK (is_staff(auth.uid()) AND tenant_id = public.current_tenant_id())$p$, t);
  END LOOP;
END$simple$;

-- profiles
CREATE POLICY "View own or tenant staff" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR (is_staff(auth.uid()) AND tenant_id = public.current_tenant_id()));
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());
CREATE POLICY "Super admin manage tenant profiles" ON public.profiles FOR ALL TO authenticated
  USING (has_role(auth.uid(),'super_admin') AND tenant_id = public.current_tenant_id())
  WITH CHECK (has_role(auth.uid(),'super_admin') AND tenant_id = public.current_tenant_id());

-- user_roles (tenant-scoped)
CREATE POLICY "View own roles" ON public.user_roles FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR (has_role(auth.uid(),'super_admin') AND tenant_id = public.current_tenant_id()));
CREATE POLICY "Super admin manage tenant roles" ON public.user_roles FOR ALL TO authenticated
  USING (has_role(auth.uid(),'super_admin') AND tenant_id = public.current_tenant_id())
  WITH CHECK (has_role(auth.uid(),'super_admin') AND tenant_id = public.current_tenant_id());

-- audit_logs
CREATE POLICY "Insert own audit" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Tenant staff view audit" ON public.audit_logs FOR SELECT TO authenticated
  USING (is_staff(auth.uid()) AND tenant_id = public.current_tenant_id());

-- contractors
CREATE POLICY "View contractors" ON public.contractors FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND (is_staff(auth.uid()) OR user_id = auth.uid()));
CREATE POLICY "Staff manage contractors" ON public.contractors FOR ALL TO authenticated
  USING (is_staff(auth.uid()) AND tenant_id = public.current_tenant_id())
  WITH CHECK (is_staff(auth.uid()) AND tenant_id = public.current_tenant_id());

-- customers
CREATE POLICY "View customers" ON public.customers FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND (is_staff(auth.uid()) OR owner_user_id = auth.uid()));
CREATE POLICY "Staff manage customers" ON public.customers FOR ALL TO authenticated
  USING (is_staff(auth.uid()) AND tenant_id = public.current_tenant_id())
  WITH CHECK (is_staff(auth.uid()) AND tenant_id = public.current_tenant_id());
CREATE POLICY "Developers create own customer" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid() AND tenant_id = public.current_tenant_id());
CREATE POLICY "Developers update own customer" ON public.customers FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid() AND tenant_id = public.current_tenant_id());

-- projects
CREATE POLICY "Manage projects" ON public.projects FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND (is_staff(auth.uid()) OR EXISTS (
    SELECT 1 FROM customers c WHERE c.id=projects.customer_id AND c.owner_user_id=auth.uid()
  )))
  WITH CHECK (tenant_id = public.current_tenant_id() AND (is_staff(auth.uid()) OR EXISTS (
    SELECT 1 FROM customers c WHERE c.id=projects.customer_id AND c.owner_user_id=auth.uid()
  )));

-- customer_directors / customer_documents
CREATE POLICY "Manage directors" ON public.customer_directors FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND (is_staff(auth.uid()) OR EXISTS (
    SELECT 1 FROM customers c WHERE c.id=customer_directors.customer_id AND c.owner_user_id=auth.uid())))
  WITH CHECK (tenant_id = public.current_tenant_id() AND (is_staff(auth.uid()) OR EXISTS (
    SELECT 1 FROM customers c WHERE c.id=customer_directors.customer_id AND c.owner_user_id=auth.uid())));
CREATE POLICY "Manage customer docs" ON public.customer_documents FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND (is_staff(auth.uid()) OR EXISTS (
    SELECT 1 FROM customers c WHERE c.id=customer_documents.customer_id AND c.owner_user_id=auth.uid())))
  WITH CHECK (tenant_id = public.current_tenant_id() AND (is_staff(auth.uid()) OR EXISTS (
    SELECT 1 FROM customers c WHERE c.id=customer_documents.customer_id AND c.owner_user_id=auth.uid())));

-- =========================================================
-- 5. DASHBOARD MODULE TABLES
-- =========================================================
CREATE TABLE public.tenant_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'KSh',
  current_year int NOT NULL DEFAULT extract(year from now())::int,
  avg_project_size numeric,
  max_ltv numeric DEFAULT 0.70,
  annual_interest_rate numeric DEFAULT 0.12,
  processing_fee_rate numeric DEFAULT 0.03,
  insurance_fee_rate numeric DEFAULT 0.01,
  standard_tenor_years int DEFAULT 6,
  par30_threshold numeric DEFAULT 0.05,
  npl_threshold numeric DEFAULT 0.08,
  collection_efficiency_target numeric DEFAULT 0.92,
  min_liquidity_ratio numeric DEFAULT 1.0,
  min_capital_adequacy numeric DEFAULT 0.20,
  roe_target numeric DEFAULT 0.18,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.tenant_settings TO authenticated;
GRANT ALL ON public.tenant_settings TO service_role;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View tenant settings" ON public.tenant_settings FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY "Super admin manage tenant settings" ON public.tenant_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(),'super_admin') AND tenant_id = public.current_tenant_id())
  WITH CHECK (has_role(auth.uid(),'super_admin') AND tenant_id = public.current_tenant_id());

INSERT INTO public.tenant_settings (tenant_id)
SELECT id FROM public.tenants ON CONFLICT DO NOTHING;

CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  location text,
  manager text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE INDEX branches_tenant_idx ON public.branches(tenant_id);
CREATE POLICY "Tenant staff manage branches" ON public.branches FOR ALL TO authenticated
  USING (is_staff(auth.uid()) AND tenant_id = public.current_tenant_id())
  WITH CHECK (is_staff(auth.uid()) AND tenant_id = public.current_tenant_id());

CREATE TABLE public.officers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  role text,
  portfolio_target numeric DEFAULT 0,
  portfolio_actual numeric DEFAULT 0,
  collections_target numeric DEFAULT 0,
  collections_actual numeric DEFAULT 0,
  par_actual numeric DEFAULT 0,
  active_clients int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.officers TO authenticated;
GRANT ALL ON public.officers TO service_role;
ALTER TABLE public.officers ENABLE ROW LEVEL SECURITY;
CREATE INDEX officers_tenant_idx ON public.officers(tenant_id);
CREATE POLICY "Tenant staff manage officers" ON public.officers FOR ALL TO authenticated
  USING (is_staff(auth.uid()) AND tenant_id = public.current_tenant_id())
  WITH CHECK (is_staff(auth.uid()) AND tenant_id = public.current_tenant_id());

CREATE TABLE public.monthly_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  period date NOT NULL,
  revenue numeric DEFAULT 0,
  interest_income numeric DEFAULT 0,
  fee_income numeric DEFAULT 0,
  operating_cost numeric DEFAULT 0,
  impairment numeric DEFAULT 0,
  net_profit numeric DEFAULT 0,
  closing_portfolio numeric DEFAULT 0,
  collections numeric DEFAULT 0,
  disbursements numeric DEFAULT 0,
  par30 numeric DEFAULT 0,
  npl_ratio numeric DEFAULT 0,
  liquidity_ratio numeric DEFAULT 0,
  ifrs9_provision numeric DEFAULT 0,
  capital_adequacy numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, period, branch_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_financials TO authenticated;
GRANT ALL ON public.monthly_financials TO service_role;
ALTER TABLE public.monthly_financials ENABLE ROW LEVEL SECURITY;
CREATE INDEX mf_tenant_idx ON public.monthly_financials(tenant_id, period);
CREATE POLICY "Tenant staff manage mf" ON public.monthly_financials FOR ALL TO authenticated
  USING (is_staff(auth.uid()) AND tenant_id = public.current_tenant_id())
  WITH CHECK (is_staff(auth.uid()) AND tenant_id = public.current_tenant_id());

-- =========================================================
-- 6. SIGNUP: create tenant + super_admin from company_name metadata
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id uuid;
  v_company text;
BEGIN
  v_company := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'company_name'), ''), NEW.email);

  INSERT INTO public.tenants (name, created_by)
  VALUES (v_company, NEW.id)
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.tenant_settings (tenant_id) VALUES (v_tenant_id);

  INSERT INTO public.profiles (id, email, full_name, tenant_id)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), v_tenant_id);

  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (NEW.id, 'super_admin', v_tenant_id);

  RETURN NEW;
END $$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
