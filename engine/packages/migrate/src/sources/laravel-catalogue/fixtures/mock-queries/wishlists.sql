-- Wishlist rows; one whose product has sold becomes a "notify me of similar"
-- want-list entry (MIGRATION.md §5).
SELECT JSON_OBJECT(
  'customerId', w.user_id,
  'productId', w.product_id,
  'productSold', COALESCE(p.is_sold = 1, FALSE),
  'createdAt', CAST(w.created_at AS CHAR)
)
FROM wishlists w
LEFT JOIN products p ON p.id = w.product_id
ORDER BY w.id;
