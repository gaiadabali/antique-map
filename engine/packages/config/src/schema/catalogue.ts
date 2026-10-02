/**
 * The catalogue vocabulary · entry: `@engine/config/schema`
 *
 * CONTENT-MODEL.md §1's controlled lists, declared once in the leaf so every contract reads
 * the same words: SCH's selects (`works.objectType`, `products.kind`), the view models (C2),
 * the analytics events (C11) and the sister snapshot (C12). A behaviour depends on each
 * value (an HS code, a purchase panel, a Reproduction label), so adding one is a contract
 * change. `INVENTORY_MODELS` sits beside the commerce settings that name it (`./commerce`).
 */
import { z } from 'zod'

/** `works.objectType` — drives the HS code and how the item page reads. */
export const OBJECT_TYPES = [
  'map',
  'sea-chart',
  'city-plan',
  'view',
  'print',
  'photograph',
  'book',
  'atlas',
  'poster',
  'document',
  'ethnographic',
  'other',
] as const
export const objectTypeSchema = z.enum(OBJECT_TYPES)
export type ObjectType = z.infer<typeof objectTypeSchema>

/** `products.kind` — an original, or how a work is sold again. */
export const PRODUCT_KINDS = [
  'original',
  'edition',
  'reproduction',
  'merchandise',
  'book',
  'service',
  'gift-card',
] as const
export const productKindSchema = z.enum(PRODUCT_KINDS)
export type ProductKind = z.infer<typeof productKindSchema>
