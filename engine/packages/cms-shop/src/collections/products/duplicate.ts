/**
 * Duplicating a product (TASKS.md 27.2.d): the copy is a draft (Payload's duplicate saves one),
 * its address is the next free one after the original's (`slugOfCopy`), and its SKUs — the
 * product's and each variant's — get a copy suffix the SKU rules accept. Payload's own default
 * for a unique text field appends " - Copy", which no SKU may hold (a space), so the copy could
 * never be saved.
 *
 * The suffix is `-COPY`, then `-COPY-2`, `-COPY-3`… until no product or variant uses it, within
 * the SKU's length. The validators still check the result on save (`./skus`).
 */
import { nextFreeSlug, slugTaken } from '@engine/cms-core/fields'
import type { FieldHook, PayloadRequest } from 'payload'

import { SKU_MAX_LENGTH } from './skus'

export const COPY_SUFFIX = '-COPY'
/** How many numbered copies are tried before the last one is handed to the validators. */
const TRIES = 50

/** The first free copy of `sku`, asking `taken` about each candidate in turn. */
export async function copySku(
  sku: string,
  taken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  let candidate = ''
  for (let n = 1; n <= TRIES; n += 1) {
    const suffix = n === 1 ? COPY_SUFFIX : `${COPY_SUFFIX}-${n}`
    candidate = `${sku.slice(0, SKU_MAX_LENGTH - suffix.length)}${suffix}`
    if (!(await taken(candidate))) return candidate
  }
  return candidate
}

/** Whether any product uses `sku` as its own or a variant's. */
async function used(req: PayloadRequest, sku: string): Promise<boolean> {
  const { totalDocs } = await req.payload.count({
    collection: 'products',
    overrideAccess: true,
    req,
    where: { or: [{ sku: { equals: sku } }, { 'variants.sku': { equals: sku } }] },
  })
  return totalDocs > 0
}

/** `beforeDuplicate` for the product's SKU and each variant's. */
export const skuOfCopy: FieldHook = async ({ value, req }) =>
  typeof value === 'string' && value.trim() !== ''
    ? copySku(value.trim(), (candidate) => used(req, candidate))
    : value

/**
 * `beforeDuplicate` for the address: the next free one after the original's (`-2`, `-3`…). The
 * shared slug field leaves it blank to be made from the name, but on a duplicate its hook still
 * sees the original's address and keeps it, which the copy may not hold (reported under 27.2).
 */
export const slugOfCopy: FieldHook = async ({ value, req }) => {
  if (typeof value !== 'string' || value.trim() === '') return undefined
  const free = await nextFreeSlug(value.trim(), (candidate) =>
    slugTaken({ req, collection: 'products', candidate }),
  )
  return free ?? undefined
}
