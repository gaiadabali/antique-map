/**
 * One SKU, one thing (CONTENT-MODEL.md §3, §8): a product's `sku` and every variant's `sku` are
 * unique across **all** products together, because the stock import and the order lines key on a
 * SKU alone (DATA.md §3: "`sku` (a product's or a variant's)"). The database holds each column
 * unique on its own (`products.sku`, `products_variants.sku`); these validators add what no index
 * can see — a variant SKU equal to some product's SKU, or the reverse, or two variants of the
 * record being saved sharing one — and answer with a plain reason naming the field.
 */
import type { PayloadRequest, Validate } from 'payload'

/** A SKU as stored: trimmed, case kept. Letters, digits, `.`, `-`, `_` and `/` only. */
export const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/
export const SKU_MAX_LENGTH = 64

type Id = number | string

const shapeError = (value: string): string | null => {
  if (value.length > SKU_MAX_LENGTH) return `Keep a SKU to ${SKU_MAX_LENGTH} characters.`
  if (!SKU_PATTERN.test(value)) {
    return 'Use letters, digits, dots, hyphens, underscores or slashes in a SKU, with no spaces.'
  }
  return null
}

/** Whether another product than `id` uses `sku` — as its own SKU (`field: 'sku'`) or a variant's. */
async function usedElsewhere(
  req: PayloadRequest,
  field: 'sku' | 'variants.sku',
  sku: string,
  id: Id | undefined,
): Promise<boolean> {
  const { totalDocs } = await req.payload.count({
    collection: 'products',
    overrideAccess: true,
    req,
    where: {
      and: [
        { [field]: { equals: sku } },
        ...(id === undefined ? [] : [{ id: { not_equals: id } }]),
      ],
    },
  })
  return totalDocs > 0
}

type ProductData = { sku?: unknown; variants?: Array<{ sku?: unknown }> | null }

/** The product's own SKU: well-formed, and no variant of any product carries it. */
export const validateProductSku: Validate<string | null | undefined> = async (
  value,
  { data, id, req },
) => {
  // A custom `validate` replaces Payload's own, its `required` check included.
  if (typeof value !== 'string' || value === '') {
    return 'Give the product its SKU: the spreadsheets and the stock match on it.'
  }
  const shape = shapeError(value)
  if (shape) return shape
  const own = (data as ProductData | undefined)?.variants ?? []
  if (own.some((variant) => variant?.sku === value)) {
    return 'A variant of this product already uses this SKU. Give the product and each variant their own.'
  }
  if (await usedElsewhere(req, 'variants.sku', value, id ?? undefined)) {
    return `The SKU "${value}" is already a variant of another product.`
  }
  return true
}

/** A variant's SKU: well-formed, used once in this product, and by no other product at all. */
export const validateVariantSku: Validate<string | null | undefined> = async (
  value,
  { data, id, req },
) => {
  if (typeof value !== 'string' || value === '') return 'Give the variant its own SKU.'
  const shape = shapeError(value)
  if (shape) return shape
  const product = data as ProductData | undefined
  if (product?.sku === value) {
    return 'This is the product’s own SKU. Give each variant a SKU of its own.'
  }
  const twins = (product?.variants ?? []).filter((variant) => variant?.sku === value)
  if (twins.length > 1) return `Two variants share the SKU "${value}". Give each its own.`
  if (await usedElsewhere(req, 'sku', value, id ?? undefined)) {
    return `The SKU "${value}" is already another product’s.`
  }
  if (await usedElsewhere(req, 'variants.sku', value, id ?? undefined)) {
    return `The SKU "${value}" is already a variant of another product.`
  }
  return true
}

/** Trims a SKU before it is validated and stored (a pasted trailing space is a different key). */
export const trimSku = ({ value }: { value?: unknown }) =>
  typeof value === 'string' ? value.trim() : value
