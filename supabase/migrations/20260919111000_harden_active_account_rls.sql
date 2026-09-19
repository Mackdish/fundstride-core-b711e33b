-- Suspended/inactive users must lose tenant-scoped data access even if they still hold a valid JWT.
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.profiles
  WHERE id = auth.uid()
    AND status = 'active'
$$;
