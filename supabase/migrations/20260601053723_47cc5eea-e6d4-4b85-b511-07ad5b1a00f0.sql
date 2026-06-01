-- 1) Extend app_role enum with the new simplified roles (idempotent)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'credit';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operations';
