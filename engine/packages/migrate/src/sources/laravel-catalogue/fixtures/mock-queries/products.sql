-- One product per row, with its maker, category ids and images (TASKS.md 7.1.f).
-- Raw values as stored: the normalisers (7.2) parse them. Staff-only fields
-- travel under "private" and never reach a public read (design.md, rule 14).
SELECT JSON_OBJECT(
  'legacyId', p.id,
  'sku', p.sku,
  'title', p.title,
  'slug', p.slug,
  'path', CONCAT('/product/', p.id, '-', p.slug),
  'originalTitle', p.original_title,
  'makerIdRaw', p.mapmaker_id,
  'maker', IF(m.id IS NULL, NULL, JSON_OBJECT('legacyId', m.id, 'name', m.name, 'slug', m.slug)),
  'publisher', p.publisher,
  'publicationPlace', p.publication_place,
  'year', p.year,
  'size', p.size,
  'colour', p.color,
  'condition', p.`condition`,
  'technique', p.technique,
  'descriptionHtml', p.description,
  'price', CAST(p.price AS CHAR),
  'priceOnRequest', p.price_on_request = 1,
  'listed', p.status = 'listed',
  'sold', p.is_sold = 1,
  'soldAt', CAST(p.sold_at AS CHAR),
  'deletedAt', CAST(p.deleted_at AS CHAR),
  'createdAt', CAST(p.created_at AS CHAR),
  'updatedAt', CAST(p.updated_at AS CHAR),
  'categoryIds', (SELECT JSON_ARRAYAGG(cp.category_id) FROM category_product cp WHERE cp.product_id = p.id),
  'images', (SELECT JSON_ARRAYAGG(JSON_OBJECT('legacyImageId', i.id, 'filename', i.filename, 'position', i.position))
             FROM product_images i WHERE i.product_id = p.id),
  'private', JSON_OBJECT('acquisitionCost', CAST(p.acquisition_cost AS CHAR), 'consignor', p.consignor, 'views', p.views)
)
FROM products p
LEFT JOIN mapmakers m ON m.id = p.mapmaker_id
ORDER BY p.id;
