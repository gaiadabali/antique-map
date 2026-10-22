-- Makers as the old site keys them; aliases (Valentijn / Valentyn) are the
-- de-duplication review's to merge, never this query's.
SELECT JSON_OBJECT(
  'legacyId', m.id,
  'name', m.name,
  'slug', m.slug,
  'path', CONCAT('/mapmaker/', m.id, '-', m.slug),
  'products', (SELECT COUNT(*) FROM products p WHERE p.mapmaker_id = m.id AND p.deleted_at IS NULL)
)
FROM mapmakers m
ORDER BY m.id;
