-- Read-only legacy orders for purchase history (MIGRATION.md §5); amounts as
-- text so no float ever touches them.
SELECT JSON_OBJECT(
  'legacyId', o.id,
  'number', o.number,
  'customerId', o.user_id,
  'status', o.status,
  'currency', o.currency,
  'subtotal', CAST(o.subtotal AS CHAR),
  'shipping', CAST(o.shipping AS CHAR),
  'total', CAST(o.total AS CHAR),
  'shippingName', o.shipping_name,
  'shippingAddress', o.shipping_address,
  'shippingCountry', o.shipping_country,
  'paymentMethod', o.payment_method,
  'createdAt', CAST(o.created_at AS CHAR),
  'lines', (SELECT JSON_ARRAYAGG(JSON_OBJECT('productId', i.product_id, 'sku', i.sku, 'title', i.title,
                                             'price', CAST(i.price AS CHAR), 'quantity', i.quantity))
            FROM order_items i WHERE i.order_id = o.id)
)
FROM orders o
ORDER BY o.id;
