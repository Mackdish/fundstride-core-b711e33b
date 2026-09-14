CREATE POLICY "Admin manage tenant profiles" ON public.profiles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND tenant_id = public.current_tenant_id())
WITH CHECK (public.has_role(auth.uid(), 'admin') AND tenant_id = public.current_tenant_id());

CREATE POLICY "Admin manage tenant roles" ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND tenant_id = public.current_tenant_id())
WITH CHECK (public.has_role(auth.uid(), 'admin') AND tenant_id = public.current_tenant_id());

CREATE POLICY "Admin view tenant roles" ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND tenant_id = public.current_tenant_id());