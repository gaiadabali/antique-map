/**
 * The one state tag a card wears, derived from the record's data and nothing else (TASKS.md 16.2).
 * Most urgent first: a record with no picture is `needsPhoto` whatever else is true; then an AI
 * draft nobody has verified; then an unpublished draft; then what happened to the stock (a work
 * sold, a product with no unit left in any store); else it is `published`.
 */
export const WALL_STATE_TAGS = [
  'needsPhoto',
  'aiDraft',
  'draft',
  'outOfStock',
  'sold',
  'published',
] as const
export type WallStateTag = (typeof WALL_STATE_TAGS)[number]

/** Tags a person has to act on: the "Needs attention" filter's meaning. */
export const ATTENTION_TAGS: readonly WallStateTag[] = ['needsPhoto', 'aiDraft', 'draft']

export type WorkFacts = {
  /** `_status`, read with `draft: true`, so an unpublished edit reads as a draft. */
  readonly draft: boolean
  readonly hasImage: boolean
  /** How many `cataloguing.aiDraft` entries are drafted and not yet verified. */
  readonly unverifiedAiDrafts: number
  /** `works.status`: available, on-hold or sold. */
  readonly availability: unknown
}

export type ProductFacts = {
  readonly draft: boolean
  readonly hasImage: boolean
  /** Units still sellable, summed over every store's stock rows. */
  readonly stock: number
}

export function deriveWorkState(work: WorkFacts): WallStateTag {
  if (!work.hasImage) return 'needsPhoto'
  if (work.unverifiedAiDrafts > 0) return 'aiDraft'
  if (work.draft) return 'draft'
  if (work.availability === 'sold') return 'sold'
  return 'published'
}

export function deriveProductState(product: ProductFacts): WallStateTag {
  if (!product.hasImage) return 'needsPhoto'
  if (product.draft) return 'draft'
  if (product.stock <= 0) return 'outOfStock'
  return 'published'
}
