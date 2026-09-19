-- Harden the auth trigger so server-created users are attached to the
-- tenant supplied by trusted server metadata instead of creating a new tenant.
-- Public signups without tenant metadata retain the original self-signup behavior.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_company text;
  v_requested_tenant text;
BEGIN
  v_requested_tenant := NULLIF(trim(NEW.raw_user_meta_data->>'tenant_id'), '');

  IF v_requested_tenant IS NOT NULL THEN
    BEGIN
      v_tenant_id := v_requested_tenant::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid tenant metadata';
    END;

    IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = v_tenant_id) THEN
      RAISE EXCEPTION 'Tenant does not exist';
    END IF;

    INSERT INTO public.profiles (id, email, full_name, tenant_id)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      v_tenant_id
    )
    ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          tenant_id = EXCLUDED.tenant_id;

    -- Trusted server provisioning functions assign the final application role
    -- after auth user creation. Do not grant super_admin from user metadata.
    RETURN NEW;
  END IF;

  v_company := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'company_name'), ''), NEW.email);

  INSERT INTO public.tenants (name, created_by)
  VALUES (v_company, NEW.id)
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.tenant_settings (tenant_id) VALUES (v_tenant_id);

  INSERT INTO public.profiles (id, email, full_name, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_tenant_id
  );

  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (NEW.id, 'super_admin', v_tenant_id);

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
