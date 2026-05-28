
-- Customers: add individual onboarding + employment + business + property + next-of-kin fields
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS middle_name text,
  ADD COLUMN IF NOT EXISTS surname text,
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS marital_status text,
  ADD COLUMN IF NOT EXISTS postal_address text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS mobile text,
  ADD COLUMN IF NOT EXISTS current_address text,
  ADD COLUMN IF NOT EXISTS estate text,
  ADD COLUMN IF NOT EXISTS house_no text,
  ADD COLUMN IF NOT EXISTS residence_type text,
  ADD COLUMN IF NOT EXISTS employment jsonb,
  ADD COLUMN IF NOT EXISTS business_entity jsonb,
  ADD COLUMN IF NOT EXISTS property jsonb,
  ADD COLUMN IF NOT EXISTS next_of_kin jsonb;

-- Projects: add reference, consultants, scope, financing, approvals, risks
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS reference_number text,
  ADD COLUMN IF NOT EXISTS county text,
  ADD COLUMN IF NOT EXISTS client_contact_person text,
  ADD COLUMN IF NOT EXISTS client_telephone text,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS client_physical_address text,
  ADD COLUMN IF NOT EXISTS client_postal_address text,
  ADD COLUMN IF NOT EXISTS consultants jsonb,
  ADD COLUMN IF NOT EXISTS nature_of_development text,
  ADD COLUMN IF NOT EXISTS floors integer,
  ADD COLUMN IF NOT EXISTS built_up_area text,
  ADD COLUMN IF NOT EXISTS construction_methodology text,
  ADD COLUMN IF NOT EXISTS key_deliverables text,
  ADD COLUMN IF NOT EXISTS source_of_funding text,
  ADD COLUMN IF NOT EXISTS loan_facility_amount numeric(18,2),
  ADD COLUMN IF NOT EXISTS client_equity numeric(18,2),
  ADD COLUMN IF NOT EXISTS expected_monthly_disbursement numeric(18,2),
  ADD COLUMN IF NOT EXISTS insurance_requirements text,
  ADD COLUMN IF NOT EXISTS approvals jsonb,
  ADD COLUMN IF NOT EXISTS risks jsonb;

-- Contractors: add professional details, contacts, services, banking
ALTER TABLE public.contractors
  ADD COLUMN IF NOT EXISTS trading_name text,
  ADD COLUMN IF NOT EXISTS consultancy_type text,
  ADD COLUMN IF NOT EXISTS kra_pin text,
  ADD COLUMN IF NOT EXISTS vat_number text,
  ADD COLUMN IF NOT EXISTS nca_registration text,
  ADD COLUMN IF NOT EXISTS professional_body_number text,
  ADD COLUMN IF NOT EXISTS year_established integer,
  ADD COLUMN IF NOT EXISTS country_of_incorporation text,
  ADD COLUMN IF NOT EXISTS physical_address text,
  ADD COLUMN IF NOT EXISTS postal_address text,
  ADD COLUMN IF NOT EXISTS town text,
  ADD COLUMN IF NOT EXISTS alt_phone text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS primary_contact jsonb,
  ADD COLUMN IF NOT EXISTS services text[],
  ADD COLUMN IF NOT EXISTS recent_project jsonb,
  ADD COLUMN IF NOT EXISTS banking jsonb,
  ADD COLUMN IF NOT EXISTS declaration jsonb;
