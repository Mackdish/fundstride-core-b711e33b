-- Harden the project document storage bucket.
-- Objects are authorized through the tenant/project relationship, never by path alone.

DROP POLICY IF EXISTS "documents tenant read" ON storage.objects;
DROP POLICY IF EXISTS "documents tenant upload" ON storage.objects;
DROP POLICY IF EXISTS "documents tenant delete" ON storage.objects;
DROP POLICY IF EXISTS "documents tenant update" ON storage.objects;

CREATE POLICY "documents tenant read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1
    FROM public.project_documents d
    JOIN public.projects p ON p.id = d.project_id
    LEFT JOIN public.customers c ON c.id = p.customer_id
    WHERE d.file_url = storage.objects.name
      AND p.tenant_id = public.current_tenant_id()
      AND (
        public.is_staff(auth.uid())
        OR c.owner_user_id = auth.uid()
      )
  )
);

CREATE POLICY "documents tenant upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    LEFT JOIN public.customers c ON c.id = p.customer_id
    WHERE p.id::text = split_part(storage.objects.name, '/', 3)
      AND p.tenant_id = public.current_tenant_id()
      AND (
        public.is_staff(auth.uid())
        OR c.owner_user_id = auth.uid()
      )
  )
);

CREATE POLICY "documents tenant update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1
    FROM public.project_documents d
    JOIN public.projects p ON p.id = d.project_id
    LEFT JOIN public.customers c ON c.id = p.customer_id
    WHERE d.file_url = storage.objects.name
      AND p.tenant_id = public.current_tenant_id()
      AND (
        public.is_staff(auth.uid())
        OR c.owner_user_id = auth.uid()
      )
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1
    FROM public.project_documents d
    JOIN public.projects p ON p.id = d.project_id
    LEFT JOIN public.customers c ON c.id = p.customer_id
    WHERE d.file_url = storage.objects.name
      AND p.tenant_id = public.current_tenant_id()
      AND (
        public.is_staff(auth.uid())
        OR c.owner_user_id = auth.uid()
      )
  )
);

CREATE POLICY "documents tenant delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1
    FROM public.project_documents d
    JOIN public.projects p ON p.id = d.project_id
    LEFT JOIN public.customers c ON c.id = p.customer_id
    WHERE d.file_url = storage.objects.name
      AND p.tenant_id = public.current_tenant_id()
      AND (
        public.is_staff(auth.uid())
        OR c.owner_user_id = auth.uid()
      )
  )
);
