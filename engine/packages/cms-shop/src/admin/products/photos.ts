/**
 * The photo uploader's rules (TASKS.md 27.2.b; the plan's §3.2), pure so the field and its tests
 * share them.
 *
 * - **A product photo's intake is filled in** (27.1.d, `collections/media/product-defaults`): a saved
 *   product's upload names it in `forProduct`, and the server sets subject, role and provenance and
 *   takes the alt text from the product's name. A product not yet saved has no id to name, so the
 *   upload carries the same defaults itself and the name typed so far as its alt text. Either way
 *   the alt text stays editable on the photo afterwards.
 * - **Order is the array's order**: the first row is the cover (the shop shows `images[0]`).
 */
import { PRODUCT_IMAGE_DEFAULTS } from '../../collections/media/product-defaults'

export type Id = number | string

/** The `_payload` of a photo's `POST /api/media`: what the server cannot fill itself. */
export function photoUploadData(input: {
  readonly productId: Id | null | undefined
  readonly name: string
}): Record<string, unknown> {
  const alt = input.name.trim()
  if (input.productId !== null && input.productId !== undefined && input.productId !== '') {
    // The server reads the saved name; the one being typed may be newer, so it is sent too.
    return { forProduct: input.productId, ...(alt === '' ? {} : { alt }) }
  }
  return { ...PRODUCT_IMAGE_DEFAULTS, alt }
}

/** Whether a photo can be uploaded yet: a saved product, or a typed name to be its alt text. */
export const canUpload = (productId: Id | null | undefined, name: string): boolean =>
  (productId !== null && productId !== undefined && productId !== '') || name.trim() !== ''

/** Only the images the media collection takes (JPEG, PNG, WebP, AVIF): the rest are skipped. */
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const

export function photoFiles<T extends { readonly type: string }>(files: readonly T[]): T[] {
  return files.filter((file) => (PHOTO_TYPES as readonly string[]).includes(file.type))
}

/** The index a row lands on when dragged from `from` and dropped on `to`, or null for no move. */
export function dropIndex(from: number, to: number, length: number): number | null {
  if (from === to || from < 0 || to < 0 || from >= length || to >= length) return null
  return to
}

/** `items` with the one at `from` moved to `to` — what the form's `moveFieldRow` does to the rows. */
export function moved<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items]
  const [item] = next.splice(from, 1)
  if (item === undefined) return next
  next.splice(to, 0, item)
  return next
}

/** The id an upload or relation value names, whether populated or bare. */
export function idOf(value: unknown): Id | null {
  const id = typeof value === 'object' && value !== null ? (value as { id?: unknown }).id : value
  return typeof id === 'number' || (typeof id === 'string' && id !== '') ? id : null
}

/** A refused upload's reason, from Payload's answer: the first field error or the message. */
export function refusalOf(body: unknown, fallback: string): string {
  const json = body as {
    errors?: Array<{ message?: string; data?: { errors?: Array<{ message?: string }> } }>
    message?: string
  } | null
  const first = json?.errors?.[0]
  return first?.data?.errors?.[0]?.message ?? first?.message ?? json?.message ?? fallback
}
