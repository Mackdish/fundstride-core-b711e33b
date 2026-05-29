
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

ALTER TABLE public.loan_facilities
  ADD COLUMN IF NOT EXISTS product_type text,
  ADD COLUMN IF NOT EXISTS loan_purpose text,
  ADD COLUMN IF NOT EXISTS security_offered text,
  ADD COLUMN IF NOT EXISTS equity_contribution numeric,
  ADD COLUMN IF NOT EXISTS recommended_amount numeric,
  ADD COLUMN IF NOT EXISTS requested_amount numeric,
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS project_id uuid,
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS relationship_manager text;

ALTER TABLE public.appraisals
  ADD COLUMN IF NOT EXISTS character_score numeric,
  ADD COLUMN IF NOT EXISTS capacity_score numeric,
  ADD COLUMN IF NOT EXISTS capital_score numeric,
  ADD COLUMN IF NOT EXISTS collateral_score numeric,
  ADD COLUMN IF NOT EXISTS conditions_score numeric,
  ADD COLUMN IF NOT EXISTS construction_risk_score numeric,
  ADD COLUMN IF NOT EXISTS executive_summary jsonb,
  ADD COLUMN IF NOT EXISTS character_data jsonb,
  ADD COLUMN IF NOT EXISTS capacity_data jsonb,
  ADD COLUMN IF NOT EXISTS capital_data jsonb,
  ADD COLUMN IF NOT EXISTS collateral_data jsonb,
  ADD COLUMN IF NOT EXISTS conditions_data jsonb,
  ADD COLUMN IF NOT EXISTS construction_data jsonb,
  ADD COLUMN IF NOT EXISTS risk_data jsonb,
  ADD COLUMN IF NOT EXISTS ifrs9_data jsonb,
  ADD COLUMN IF NOT EXISTS analyst_recommendation jsonb,
  ADD COLUMN IF NOT EXISTS committee_decision jsonb;

ALTER TABLE public.site_visits
  ADD COLUMN IF NOT EXISTS loan_id uuid,
  ADD COLUMN IF NOT EXISTS drawdown_request_id uuid,
  ADD COLUMN IF NOT EXISTS purpose text,
  ADD COLUMN IF NOT EXISTS planned_progress_pct numeric,
  ADD COLUMN IF NOT EXISTS actual_progress_pct numeric,
  ADD COLUMN IF NOT EXISTS works_completed text,
  ADD COLUMN IF NOT EXISTS works_ongoing text,
  ADD COLUMN IF NOT EXISTS works_pending text,
  ADD COLUMN IF NOT EXISTS qs_assessment jsonb,
  ADD COLUMN IF NOT EXISTS quality_checklist jsonb,
  ADD COLUMN IF NOT EXISTS hse_compliance jsonb,
  ADD COLUMN IF NOT EXISTS risk_matrix jsonb,
  ADD COLUMN IF NOT EXISTS contractor_scorecard jsonb,
  ADD COLUMN IF NOT EXISTS drawdown_recommendation text,
  ADD COLUMN IF NOT EXISTS recommendation_details text,
  ADD COLUMN IF NOT EXISTS action_tracker jsonb,
  ADD COLUMN IF NOT EXISTS engineer_qs text;

CREATE TABLE IF NOT EXISTS public.credit_monitoring_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id uuid NOT NULL,
  customer_id uuid,
  project_id uuid,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  relationship_officer text,
  performance jsonb,
  repayment_status text,
  days_past_due integer DEFAULT 0,
  arrears_amount numeric DEFAULT 0,
  missed_installments integer DEFAULT 0,
  payment_trend text,
  repayment_concerns text,
  business_progress jsonb,
  collateral_status jsonb,
  risk_assessment jsonb,
  warning_indicators text[],
  engagement_notes jsonb,
  recommended_actions text[],
  officer_recommendation text,
  prepared_by uuid,
  reviewed_by uuid,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.credit_monitoring_reports TO authenticated;
GRANT ALL ON public.credit_monitoring_reports TO service_role;

ALTER TABLE public.credit_monitoring_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff view monitoring" ON public.credit_monitoring_reports
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff manage monitoring" ON public.credit_monitoring_reports
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP TRIGGER IF EXISTS update_credit_monitoring_updated_at ON public.credit_monitoring_reports;
CREATE TRIGGER update_credit_monitoring_updated_at
BEFORE UPDATE ON public.credit_monitoring_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
