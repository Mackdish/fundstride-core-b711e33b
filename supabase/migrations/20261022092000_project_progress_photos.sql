-- Module 3: private progress photo storage and project-linked photo metadata.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'progress-photos',
  'progress-photos',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.project_progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  progress_update_id uuid NOT NULL REFERENCES public.project_progress_updates(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  caption text NOT NULL DEFAULT '' CHECK (length(caption) <= 500),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_progress_photos_update_idx
  ON public.project_progress_photos (progress_update_id, created_at);

ALTER TABLE public.project_progress_photos ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.project_progress_photos TO authenticated;
GRANT ALL ON public.project_progress_photos TO service_role;

CREATE OR REPLACE FUNCTION public.set_project_progress_photo_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  update_project uuid;
  update_tenant uuid;
BEGIN
  SELECT u.project_id, u.tenant_id
    INTO update_project, update_tenant
  FROM public.project_progress_updates u
  WHERE u.id = NEW.progress_update_id;

  IF update_project IS NULL OR update_project <> NEW.project_id THEN
    RAISE EXCEPTION 'Progress photo must reference the same project as its update';
  END IF;

  IF update_tenant IS NULL THEN
    RAISE EXCEPTION 'Progress update tenant not found';
  END IF;

  NEW.tenant_id := update_tenant;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_progress_photos_set_scope
  ON public.project_progress_photos;
CREATE TRIGGER project_progress_photos_set_scope
  BEFORE INSERT OR UPDATE OF progress_update_id, project_id, tenant_id
  ON public.project_progress_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_project_progress_photo_scope();

REVOKE EXECUTE ON FUNCTION public.set_project_progress_photo_scope()
  FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Staff read progress photos" ON public.project_progress_photos;
CREATE POLICY "Staff read progress photos"
  ON public.project_progress_photos
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.can_manage_project_progress(auth.uid(), tenant_id)
  );

DROP POLICY IF EXISTS "Customers read published progress photos" ON public.project_progress_photos;
CREATE POLICY "Customers read published progress photos"
  ON public.project_progress_photos
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM public.project_progress_updates u
      JOIN public.projects p ON p.id = u.project_id
      LEFT JOIN public.customers c ON c.id = p.customer_id
      WHERE u.id = project_progress_photos.progress_update_id
        AND u.project_id = project_progress_photos.project_id
        AND u.publication_status = 'published'
        AND (
          c.owner_user_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.customer_project_access access
            WHERE access.project_id = p.id
              AND access.user_id = auth.uid()
              AND access.tenant_id = public.current_tenant_id()
              AND access.revoked_at IS NULL
          )
        )
    )
  );

-- All storage objects are private. Paths are:
-- <tenant UUID>/<project UUID>/<progress-update UUID>/<filename>
DROP POLICY IF EXISTS "Staff upload progress photos" ON storage.objects;
CREATE POLICY "Staff upload progress photos"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND split_part(name, '/', 1) = public.current_tenant_id()::text
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.project_progress_updates u ON u.project_id = p.id
      WHERE p.id::text = split_part(storage.objects.name, '/', 2)
        AND u.id::text = split_part(storage.objects.name, '/', 3)
        AND u.tenant_id = public.current_tenant_id()
        AND p.tenant_id = public.current_tenant_id()
        AND public.can_manage_project_progress(auth.uid(), public.current_tenant_id())
    )
  );

DROP POLICY IF EXISTS "Read authorized progress photos" ON storage.objects;
CREATE POLICY "Read authorized progress photos"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND split_part(name, '/', 1) = public.current_tenant_id()::text
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.project_progress_updates u ON u.project_id = p.id
      LEFT JOIN public.customers c ON c.id = p.customer_id
      WHERE p.id::text = split_part(storage.objects.name, '/', 2)
        AND u.id::text = split_part(storage.objects.name, '/', 3)
        AND u.tenant_id = public.current_tenant_id()
        AND p.tenant_id = public.current_tenant_id()
        AND (
          public.can_manage_project_progress(auth.uid(), public.current_tenant_id())
          OR (
            u.publication_status = 'published'
            AND (
              c.owner_user_id = auth.uid()
              OR EXISTS (
                SELECT 1
                FROM public.customer_project_access access
                WHERE access.project_id = p.id
                  AND access.user_id = auth.uid()
                  AND access.tenant_id = public.current_tenant_id()
                  AND access.revoked_at IS NULL
              )
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Staff update progress photos" ON storage.objects;
CREATE POLICY "Staff update progress photos"
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND split_part(name, '/', 1) = public.current_tenant_id()::text
    AND public.can_manage_project_progress(auth.uid(), public.current_tenant_id())
  )
  WITH CHECK (
    bucket_id = 'progress-photos'
    AND split_part(name, '/', 1) = public.current_tenant_id()::text
    AND public.can_manage_project_progress(auth.uid(), public.current_tenant_id())
  );

DROP POLICY IF EXISTS "Staff delete progress photos" ON storage.objects;
CREATE POLICY "Staff delete progress photos"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'progress-photos'
    AND split_part(name, '/', 1) = public.current_tenant_id()::text
    AND public.can_manage_project_progress(auth.uid(), public.current_tenant_id())
  );
