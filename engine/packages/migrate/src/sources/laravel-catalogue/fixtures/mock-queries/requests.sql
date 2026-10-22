-- Price requests and product enquiries, for the lead history.
SELECT JSON_OBJECT(
  'legacyId', r.id,
  'type', r.type,
  'productId', r.product_id,
  'customerId', r.user_id,
  'name', r.name,
  'email', r.email,
  'body', r.body,
  'createdAt', CAST(r.created_at AS CHAR)
)
FROM product_requests r
ORDER BY r.id;
