-- The legacy URL list from the export (MIGRATION.md §6): every product that
-- was ever public (listed, sold included, not deleted), every category and
-- maker page, every product image and every static page — the list the
-- redirect gate requests against the new site (TASKS.md 37.1.b).
SELECT JSON_OBJECT('path', u.path, 'kind', u.kind) FROM (
  SELECT CONCAT('/product/', p.id, '-', p.slug) AS path, 'product' AS kind
    FROM products p WHERE p.status = 'listed' AND p.deleted_at IS NULL
  UNION ALL
  SELECT CONCAT('/category/', c.id, '-', c.slug), 'category'
    FROM categories c WHERE c.active = 'active' AND c.visible = 'visible'
  UNION ALL
  SELECT CONCAT('/mapmaker/', m.id, '-', m.slug), 'maker' FROM mapmakers m
  UNION ALL
  SELECT CONCAT('/storage/products/', i.filename), 'image'
    FROM product_images i JOIN products p ON p.id = i.product_id
    WHERE p.status = 'listed' AND p.deleted_at IS NULL
  UNION ALL
  SELECT CONCAT('/', pg.slug), 'page' FROM pages pg
) u
ORDER BY u.kind, u.path;
