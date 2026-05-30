
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id uuid;
  v_company   text;
  v_provided  text;
BEGIN
  v_provided := NULLIF(trim(NEW.raw_user_meta_data->>'tenant_id'), '');
  IF v_provided IS NOT NULL THEN
    v_tenant_id := v_provided::uuid;
  ELSE
    v_company := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'company_name'), ''), NEW.email);
    INSERT INTO public.tenants (name, created_by) VALUES (v_company, NEW.id)
    RETURNING id INTO v_tenant_id;
    INSERT INTO public.tenant_settings (tenant_id) VALUES (v_tenant_id);
    -- first user in a brand-new tenant becomes its super_admin
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (NEW.id, 'super_admin', v_tenant_id);
  END IF;

  INSERT INTO public.profiles (id, email, full_name, tenant_id)
  VALUES (NEW.id, NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
          v_tenant_id);

  RETURN NEW;
END $$;
