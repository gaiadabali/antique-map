-- Customers for the claim-your-account import (MIGRATION.md §5): named
-- columns only, so the password hash and remember token never leave the
-- container. Staff accounts are not customers.
SELECT JSON_OBJECT(
  'legacyId', u.id,
  'name', u.name,
  'email', u.email,
  'phone', u.phone,
  'address', u.address,
  'city', u.city,
  'country', u.country,
  'emailVerifiedAt', CAST(u.email_verified_at AS CHAR),
  'createdAt', CAST(u.created_at AS CHAR)
)
FROM users u
WHERE u.is_admin = 0
ORDER BY u.id;
