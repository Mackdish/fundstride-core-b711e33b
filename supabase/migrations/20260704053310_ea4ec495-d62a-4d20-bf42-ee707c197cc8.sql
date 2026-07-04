
-- Lock down SECURITY DEFINER functions.
-- Trigger-only functions never need direct EXECUTE by API roles.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_create_drawdown_for_loan() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.activate_loan_on_drawdown()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()      FROM PUBLIC, anon, authenticated;

-- RLS helper functions are invoked inside policies for signed-in users only.
-- Keep EXECUTE for `authenticated`, revoke from PUBLIC and `anon`.
REVOKE EXECUTE ON FUNCTION public.current_tenant_id()             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid)                  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_customer_owner(uuid)         FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_tenant_id()              TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid)                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_customer_owner(uuid)          TO authenticated;
