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

-- Keep the document bucket private and cap individual uploads at 25 MiB.
UPDATE storage.buckets
SET public = false,
    file_size_limit = 26214400
WHERE id = 'documents';
