
-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.app_role AS ENUM (
  'super_admin','credit_officer','operations_officer','site_monitoring_officer',
  'finance_officer','risk_compliance_officer','developer','contractor','executive'
);

CREATE TYPE public.entity_status AS ENUM ('draft','pending','active','rejected','blocked','closed','completed');
CREATE TYPE public.risk_grade AS ENUM ('green','amber','red','dark_red');
CREATE TYPE public.severity AS ENUM ('low','medium','high','critical');

-- =========================
-- PROFILES + ROLES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin','credit_officer','operations_officer','site_monitoring_officer',
                   'finance_officer','risk_compliance_officer','executive')
  )
$$;

-- profiles policies
CREATE POLICY "View own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- user_roles policies
CREATE POLICY "View own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admin manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  -- Auto-grant super_admin to the seeded admin email
  IF NEW.email = 'macknonvulimu@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'developer') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- AUDIT LOGS
-- =========================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Staff view audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- =========================
-- CUSTOMERS
-- =========================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  customer_type TEXT NOT NULL DEFAULT 'corporate',
  pin TEXT,
  registration_number TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  sector TEXT,
  status public.entity_status NOT NULL DEFAULT 'draft',
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view customers" ON public.customers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR owner_user_id = auth.uid());
CREATE POLICY "Staff manage customers" ON public.customers FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Developers create own customer" ON public.customers FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Developers update own customer" ON public.customers FOR UPDATE TO authenticated USING (owner_user_id = auth.uid());

CREATE TABLE public.customer_directors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  id_number TEXT,
  shareholding_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  kra_pin TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_directors TO authenticated;
GRANT ALL ON public.customer_directors TO service_role;
ALTER TABLE public.customer_directors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View directors" ON public.customer_directors FOR SELECT TO authenticated USING (
  public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.owner_user_id = auth.uid())
);
CREATE POLICY "Manage directors" ON public.customer_directors FOR ALL TO authenticated USING (
  public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.owner_user_id = auth.uid())
) WITH CHECK (
  public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.owner_user_id = auth.uid())
);

CREATE TABLE public.customer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  version INT NOT NULL DEFAULT 1,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_documents TO authenticated;
GRANT ALL ON public.customer_documents TO service_role;
ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View customer docs" ON public.customer_documents FOR SELECT TO authenticated USING (
  public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.owner_user_id = auth.uid())
);
CREATE POLICY "Manage customer docs" ON public.customer_documents FOR ALL TO authenticated USING (
  public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.owner_user_id = auth.uid())
) WITH CHECK (
  public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.owner_user_id = auth.uid())
);

-- =========================
-- PROJECTS
-- =========================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  gps_lat NUMERIC(10,6),
  gps_lng NUMERIC(10,6),
  project_type TEXT,
  units INT,
  expected_value NUMERIC(18,2),
  start_date DATE,
  end_date DATE,
  status public.entity_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View projects" ON public.projects FOR SELECT TO authenticated USING (
  public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.owner_user_id = auth.uid())
);
CREATE POLICY "Manage projects" ON public.projects FOR ALL TO authenticated USING (
  public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.owner_user_id = auth.uid())
) WITH CHECK (
  public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.owner_user_id = auth.uid())
);

CREATE TABLE public.project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_documents TO authenticated;
GRANT ALL ON public.project_documents TO service_role;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View project docs" ON public.project_documents FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Manage project docs" ON public.project_documents FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- =========================
-- CREDIT
-- =========================
CREATE TABLE public.appraisals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requested_amount NUMERIC(18,2),
  recommended_amount NUMERIC(18,2),
  ltv NUMERIC(6,3),
  dscr NUMERIC(6,3),
  score NUMERIC(5,2),
  grade public.risk_grade,
  status public.entity_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appraisals TO authenticated;
GRANT ALL ON public.appraisals TO service_role;
ALTER TABLE public.appraisals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view appraisals" ON public.appraisals FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage appraisals" ON public.appraisals FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.approval_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appraisal_id UUID NOT NULL REFERENCES public.appraisals(id) ON DELETE CASCADE,
  condition_type TEXT,
  description TEXT NOT NULL,
  due_date DATE,
  responsible_party TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_conditions TO authenticated;
GRANT ALL ON public.approval_conditions TO service_role;
ALTER TABLE public.approval_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view conds" ON public.approval_conditions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage conds" ON public.approval_conditions FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- =========================
-- LOAN
-- =========================
CREATE TABLE public.loan_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appraisal_id UUID NOT NULL REFERENCES public.appraisals(id) ON DELETE CASCADE,
  approved_amount NUMERIC(18,2) NOT NULL,
  interest_rate NUMERIC(6,3) NOT NULL,
  tenor_months INT NOT NULL,
  processing_fee NUMERIC(18,2) DEFAULT 0,
  insurance NUMERIC(18,2) DEFAULT 0,
  repayment_frequency TEXT NOT NULL DEFAULT 'monthly',
  status public.entity_status NOT NULL DEFAULT 'draft',
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_facilities TO authenticated;
GRANT ALL ON public.loan_facilities TO service_role;
ALTER TABLE public.loan_facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view loans" ON public.loan_facilities FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage loans" ON public.loan_facilities FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.repayment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loan_facilities(id) ON DELETE CASCADE,
  instalment_date DATE NOT NULL,
  principal NUMERIC(18,2) NOT NULL,
  interest NUMERIC(18,2) NOT NULL,
  total NUMERIC(18,2) NOT NULL,
  balance NUMERIC(18,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repayment_schedules TO authenticated;
GRANT ALL ON public.repayment_schedules TO service_role;
ALTER TABLE public.repayment_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view sched" ON public.repayment_schedules FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage sched" ON public.repayment_schedules FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.covenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loan_facilities(id) ON DELETE CASCADE,
  condition TEXT NOT NULL,
  threshold TEXT,
  monitoring_frequency TEXT,
  status TEXT NOT NULL DEFAULT 'compliant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.covenants TO authenticated;
GRANT ALL ON public.covenants TO service_role;
ALTER TABLE public.covenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view cov" ON public.covenants FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage cov" ON public.covenants FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- =========================
-- CONSTRUCTION
-- =========================
CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_pct NUMERIC(5,2) NOT NULL,
  eligible_amount NUMERIC(18,2),
  sequence INT NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestones TO authenticated;
GRANT ALL ON public.milestones TO service_role;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view ms" ON public.milestones FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage ms" ON public.milestones FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.drawdown_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loan_facilities(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  requested_amount NUMERIC(18,2) NOT NULL,
  certified_amount NUMERIC(18,2),
  status public.entity_status NOT NULL DEFAULT 'pending',
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drawdown_requests TO authenticated;
GRANT ALL ON public.drawdown_requests TO service_role;
ALTER TABLE public.drawdown_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view dd" ON public.drawdown_requests FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage dd" ON public.drawdown_requests FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  officer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visit_date DATE NOT NULL,
  gps_lat NUMERIC(10,6),
  gps_lng NUMERIC(10,6),
  weather TEXT,
  observations TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_visits TO authenticated;
GRANT ALL ON public.site_visits TO service_role;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view sv" ON public.site_visits FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage sv" ON public.site_visits FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.site_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_visit_id UUID NOT NULL REFERENCES public.site_visits(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  caption TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  geotag TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_media TO authenticated;
GRANT ALL ON public.site_media TO service_role;
ALTER TABLE public.site_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view media" ON public.site_media FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage media" ON public.site_media FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_visit_id UUID NOT NULL REFERENCES public.site_visits(id) ON DELETE CASCADE,
  category TEXT,
  severity public.severity NOT NULL DEFAULT 'low',
  description TEXT NOT NULL,
  responsible_party TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issues TO authenticated;
GRANT ALL ON public.issues TO service_role;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view iss" ON public.issues FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage iss" ON public.issues FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- =========================
-- CONTRACTORS
-- =========================
CREATE TABLE public.contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  registration_number TEXT,
  phone TEXT,
  email TEXT,
  specialization TEXT,
  nca_category TEXT,
  status public.entity_status NOT NULL DEFAULT 'active',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractors TO authenticated;
GRANT ALL ON public.contractors TO service_role;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View contractors" ON public.contractors FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Staff manage contractors" ON public.contractors FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.contractor_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scope TEXT,
  amount NUMERIC(18,2),
  start_date DATE,
  end_date DATE,
  retention_pct NUMERIC(5,2) DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_contracts TO authenticated;
GRANT ALL ON public.contractor_contracts TO service_role;
ALTER TABLE public.contractor_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view contracts" ON public.contractor_contracts FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage contracts" ON public.contractor_contracts FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.contractor_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  delivery NUMERIC(5,2),
  quality NUMERIC(5,2),
  safety NUMERIC(5,2),
  compliance NUMERIC(5,2),
  financial_reliability NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_scores TO authenticated;
GRANT ALL ON public.contractor_scores TO service_role;
ALTER TABLE public.contractor_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view scores" ON public.contractor_scores FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage scores" ON public.contractor_scores FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- =========================
-- FINANCE
-- =========================
CREATE TABLE public.beneficiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  mobile_wallet TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beneficiaries TO authenticated;
GRANT ALL ON public.beneficiaries TO service_role;
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view ben" ON public.beneficiaries FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage ben" ON public.beneficiaries FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawdown_id UUID REFERENCES public.drawdown_requests(id) ON DELETE SET NULL,
  beneficiary_id UUID REFERENCES public.beneficiaries(id) ON DELETE SET NULL,
  amount NUMERIC(18,2) NOT NULL,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  authorized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view pay" ON public.payments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage pay" ON public.payments FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loan_facilities(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  debit NUMERIC(18,2) DEFAULT 0,
  credit NUMERIC(18,2) DEFAULT 0,
  balance NUMERIC(18,2),
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ledger_entries TO authenticated;
GRANT ALL ON public.ledger_entries TO service_role;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view ledger" ON public.ledger_entries FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage ledger" ON public.ledger_entries FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loan_facilities(id) ON DELETE CASCADE,
  amount NUMERIC(18,2) NOT NULL,
  payment_date DATE NOT NULL,
  allocation_principal NUMERIC(18,2) DEFAULT 0,
  allocation_interest NUMERIC(18,2) DEFAULT 0,
  reference TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repayments TO authenticated;
GRANT ALL ON public.repayments TO service_role;
ALTER TABLE public.repayments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view rep" ON public.repayments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage rep" ON public.repayments FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- =========================
-- RISK
-- =========================
CREATE TABLE public.risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  score NUMERIC(5,2) NOT NULL,
  grade public.risk_grade NOT NULL,
  drivers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_scores TO authenticated;
GRANT ALL ON public.risk_scores TO service_role;
ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view risk" ON public.risk_scores FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage risk" ON public.risk_scores FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.risk_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_event TEXT NOT NULL,
  severity public.severity NOT NULL DEFAULT 'medium',
  entity_type TEXT,
  entity_id UUID,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_alerts TO authenticated;
GRANT ALL ON public.risk_alerts TO service_role;
ALTER TABLE public.risk_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view alerts" ON public.risk_alerts FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage alerts" ON public.risk_alerts FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.ifrs9_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loan_facilities(id) ON DELETE CASCADE,
  days_past_due INT NOT NULL DEFAULT 0,
  stage INT NOT NULL DEFAULT 1,
  sicr_flags JSONB,
  impairment_driver TEXT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ifrs9_indicators TO authenticated;
GRANT ALL ON public.ifrs9_indicators TO service_role;
ALTER TABLE public.ifrs9_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view ifrs" ON public.ifrs9_indicators FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage ifrs" ON public.ifrs9_indicators FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- =========================
-- STORAGE BUCKET (documents)
-- =========================
INSERT INTO storage.buckets (id, name, public) VALUES ('documents','documents', false) ON CONFLICT DO NOTHING;
CREATE POLICY "Authenticated read documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "Authenticated upload documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Authenticated update documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents');
