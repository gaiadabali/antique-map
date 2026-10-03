/**
 * The five import kinds and their column templates (CONTENT-MODEL.md §9). The template is the
 * header row spelled exactly; a file whose header does not carry every column is refused whole
 * before any row is read, with the first wrong column named. Extra columns the seed repeats
 * (`stores.public`, `stock.variant_sku`) are known too. The `*` in the template's comment marks the
 * columns a row may not leave empty — refused with the column named, never guessed around.
 */
import type { ImportKind } from './types'

/** The antiques sheet: a work is the object; the key is the gallery's own stock number. */
export const ANTIQUE_COLUMNS = [
  'stock_number',
  'title_en',
  'title_id',
  'original_title',
  'object_type',
  'makers',
  'date_display',
  'date_from',
  'date_to',
  'date_precision',
  'places',
  'technique',
  'colour',
  'image_h_mm',
  'image_w_mm',
  'sheet_h_mm',
  'sheet_w_mm',
  'grade',
  'condition_notes_en',
  'condition_notes_id',
  'description_en',
  'description_id',
  'subjects',
  'references',
  'location',
  'status',
  'asking_price',
  'asking_currency',
  'legacy_id',
  'legacy_url',
  'image_files',
] as const

export const PRODUCT_COLUMNS = [
  'sku',
  'parent_sku',
  'name_en',
  'name_id',
  'variant_label_en',
  'variant_label_id',
  'category',
  'description_en',
  'description_id',
  'price_idr',
  'related_stock_number',
  'image_files',
  'active',
] as const

export const STORE_COLUMNS = [
  'store_code',
  'name',
  'address',
  'area',
  'lat',
  'lng',
  'whatsapp',
  'hours_en',
  'hours_id',
  'active',
  'public',
] as const

export const STOCK_COLUMNS = ['store_code', 'sku', 'variant_sku', 'quantity'] as const

/** The discounts sheet: the `discounts` collection's own fields (§9 does not define these). */
export const DISCOUNT_COLUMNS = [
  'code',
  'kind',
  'value',
  'min_spend',
  'once_per_buyer',
  'starts_at',
  'ends_at',
  'usage_limit',
  'active',
] as const

/** The header each kind's file must carry, in the documented order. */
export function template(kind: ImportKind): readonly string[] {
  switch (kind) {
    case 'antiques':
      return ANTIQUE_COLUMNS
    case 'products':
      return PRODUCT_COLUMNS
    case 'stores':
      return STORE_COLUMNS
    case 'stock':
      return STOCK_COLUMNS
    case 'discounts':
      return DISCOUNT_COLUMNS
  }
}

/** The columns a row may not leave empty — the template's `*`. */
export function requiredColumns(kind: ImportKind): readonly string[] {
  switch (kind) {
    case 'antiques':
      return ['stock_number', 'title_en', 'object_type', 'grade', 'location']
    case 'products':
      return ['sku', 'name_en', 'category', 'price_idr']
    case 'stores':
      return ['store_code', 'name', 'address', 'lat', 'lng']
    case 'stock':
      return ['store_code', 'sku', 'quantity']
    case 'discounts':
      return ['code', 'kind', 'value']
  }
}

/** The name of the key column (or the two, joined) the kind matches on (DATA.md §3). */
export function keyColumns(kind: ImportKind): readonly string[] {
  switch (kind) {
    case 'antiques':
      return ['stock_number']
    case 'products':
      return ['sku']
    case 'stores':
      return ['store_code']
    case 'stock':
      return ['store_code', 'sku', 'variant_sku']
    case 'discounts':
      return ['code']
  }
}
