-- Remove accidental dual customer/staff identities.
-- If a user already has a customer role, keep the customer identity
-- and remove any staff roles so they no longer appear in Staff Members.

WITH customer_users AS (
  SELECT DISTINCT ur.user_id
  FROM public.user_roles ur
  WHERE ur.role = 'customer'
)
DELETE FROM public.user_roles ur
USING customer_users cu
WHERE ur.user_id = cu.user_id
  AND ur.role <> 'customer';

-- Optional safety check for future reviewers:
-- there should now be no users with both customer and staff roles.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.role = 'customer'
      AND EXISTS (
        SELECT 1
        FROM public.user_roles ur2
        WHERE ur2.user_id = ur.user_id
          AND ur2.role <> 'customer'
      )
  ) THEN
    RAISE EXCEPTION 'Dual-role users still exist after cleanup';
  END IF;
END $$;
