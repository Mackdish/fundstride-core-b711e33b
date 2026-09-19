-- Audit records are created by trusted server code so authenticated clients
-- cannot forge financial/security events through the Data API.
DROP POLICY IF EXISTS "Insert own audit" ON public.audit_logs;
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM authenticated;
