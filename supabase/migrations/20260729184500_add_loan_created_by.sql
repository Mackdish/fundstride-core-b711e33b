-- Loan facilities need created_by because the auto-create drawdown trigger
-- uses NEW.created_by when inserting the first drawdown request.
ALTER TABLE public.loan_facilities
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
