-- The legacy category tree, one category per row, with the count the pivot
-- actually holds (the old site's counts do not roll up: MIGRATION.md §4).
SELECT JSON_OBJECT(
  'legacyId', c.id,
  'parentId', NULLIF(c.parent_id, 0),
  'slug', c.slug,
  'name', c.name,
  'active', c.active = 'active',
  'visible', c.visible = 'visible',
  'position', c.position,
  'path', CONCAT('/category/', c.id, '-', c.slug),
  'products', (SELECT COUNT(*) FROM category_product cp WHERE cp.category_id = c.id)
)
FROM categories c
ORDER BY c.id;
