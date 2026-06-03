
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass::text AS tbl
    FROM pg_constraint
    WHERE confrelid = 'public.tenants'::regclass
      AND confdeltype <> 'c'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE', r.tbl, r.conname);
  END LOOP;
END $$;
