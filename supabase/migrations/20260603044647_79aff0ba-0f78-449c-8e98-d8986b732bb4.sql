-- Add platform_admin role (used by companies module)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_admin';

-- Auto-create a pending drawdown request when a new loan facility is created,
-- so freshly applied loans appear in the Drawdowns pipeline.
CREATE OR REPLACE FUNCTION public.auto_create_drawdown_for_loan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.drawdown_requests (loan_id, requested_amount, status, tenant_id, requested_by)
  VALUES (NEW.id, COALESCE(NEW.approved_amount, NEW.requested_amount, 0), 'pending', NEW.tenant_id, COALESCE(NEW.created_by, auth.uid()));
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_auto_create_drawdown ON public.loan_facilities;
CREATE TRIGGER trg_auto_create_drawdown
AFTER INSERT ON public.loan_facilities
FOR EACH ROW EXECUTE FUNCTION public.auto_create_drawdown_for_loan();

-- When a drawdown becomes 'active' (disbursed), flip the linked loan to 'active'
-- and stamp activated_at so it shows up in the active loan listing.
CREATE OR REPLACE FUNCTION public.activate_loan_on_drawdown()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM NEW.status) AND NEW.loan_id IS NOT NULL THEN
    UPDATE public.loan_facilities
       SET status = 'active', activated_at = COALESCE(activated_at, now())
     WHERE id = NEW.loan_id AND status <> 'active';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_activate_loan_on_drawdown ON public.drawdown_requests;
CREATE TRIGGER trg_activate_loan_on_drawdown
AFTER UPDATE ON public.drawdown_requests
FOR EACH ROW EXECUTE FUNCTION public.activate_loan_on_drawdown();
