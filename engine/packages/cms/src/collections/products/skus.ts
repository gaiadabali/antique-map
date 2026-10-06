/**
 * One SKU, one thing (CONTENT-MODEL.md §3, §8): a product's `sku` and every variant's `sku` are
 * unique across **all** products together, because the stock import and the order lines key on a
 * SKU alone (DATA.md §3: "`sku` (a product's or a variant's)"). The database holds each column
 * unique on its own (`products.sku`, `products_variants.sku`); these validators add what no index
 * can see — a variant SKU equal to some product's SKU, or the reverse, or two variants of the
 * record being saved sharing one — and answer with a plain reason naming the field.
 */
import type { PayloadRequest, Validate } from 'payload'

import { pickLanguage } from './money'

/** A SKU as stored: trimmed, case kept. Letters, digits, `.`, `-`, `_` and `/` only. */
export const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/
export const SKU_MAX_LENGTH = 64

type Id = number | string

const shapeError = (req: PayloadRequest | undefined, value: string): string | null => {
  if (value.length > SKU_MAX_LENGTH) {
    return pickLanguage(req, {
      en: `Keep a SKU to ${SKU_MAX_LENGTH} characters.`,
      id: `Batasi SKU hingga ${SKU_MAX_LENGTH} karakter.`,
    })
  }
  if (!SKU_PATTERN.test(value)) {
    return pickLanguage(req, {
      en: 'Use letters, digits, dots, hyphens, underscores or slashes in a SKU, with no spaces.',
      id: 'Gunakan huruf, angka, titik, tanda hubung, garis bawah, atau garis miring pada SKU, tanpa spasi.',
    })
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
  // The browser runs this validator too, before the save reaches the server; `req.payload` is
  // only there server-side (D3: the client had no way to answer this and surfaced a stray
  // "Error validating field" under an otherwise valid SKU). The server validates again regardless.
  if (req.payload === undefined) return false
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
    return pickLanguage(req, {
      en: 'Give the product its SKU: the spreadsheets and the stock match on it.',
      id: 'Berikan SKU produk ini: lembar data dan stok dicocokkan dengannya.',
    })
  }
  const shape = shapeError(req, value)
  if (shape) return shape
  const own = (data as ProductData | undefined)?.variants ?? []
  if (own.some((variant) => variant?.sku === value)) {
    return pickLanguage(req, {
      en: 'A variant of this product already uses this SKU. Give the product and each variant their own.',
      id: 'Sebuah varian produk ini sudah memakai SKU ini. Berikan produk dan tiap varian SKU-nya sendiri.',
    })
  }
  if (await usedElsewhere(req, 'variants.sku', value, id ?? undefined)) {
    return pickLanguage(req, {
      en: `The SKU "${value}" is already a variant of another product.`,
      id: `SKU "${value}" sudah menjadi varian produk lain.`,
    })
  }
  return true
}

/** A variant's SKU: well-formed, used once in this product, and by no other product at all. */
export const validateVariantSku: Validate<string | null | undefined> = async (
  value,
  { data, id, req },
) => {
  if (typeof value !== 'string' || value === '') {
    return pickLanguage(req, {
      en: 'Give the variant its own SKU.',
      id: 'Berikan SKU varian ini sendiri.',
    })
  }
  const shape = shapeError(req, value)
  if (shape) return shape
  const product = data as ProductData | undefined
  if (product?.sku === value) {
    return pickLanguage(req, {
      en: 'This is the product’s own SKU. Give each variant a SKU of its own.',
      id: 'Ini adalah SKU produk itu sendiri. Berikan tiap varian SKU-nya sendiri.',
    })
  }
  const twins = (product?.variants ?? []).filter((variant) => variant?.sku === value)
  if (twins.length > 1) {
    return pickLanguage(req, {
      en: `Two variants share the SKU "${value}". Give each its own.`,
      id: `Dua varian memakai SKU "${value}" yang sama. Berikan masing-masing SKU sendiri.`,
    })
  }
  if (await usedElsewhere(req, 'sku', value, id ?? undefined)) {
    return pickLanguage(req, {
      en: `The SKU "${value}" is already another product’s.`,
      id: `SKU "${value}" sudah menjadi milik produk lain.`,
    })
  }
  if (await usedElsewhere(req, 'variants.sku', value, id ?? undefined)) {
    return pickLanguage(req, {
      en: `The SKU "${value}" is already a variant of another product.`,
      id: `SKU "${value}" sudah menjadi varian produk lain.`,
    })
  }
  return true
}

/** Trims a SKU before it is validated and stored (a pasted trailing space is a different key). */
export const trimSku = ({ value }: { value?: unknown }) =>
  typeof value === 'string' ? value.trim() : value
