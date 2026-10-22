/**
 * The shop's categories (DATA.md §1) as the vocabulary layer seeds them: into `categories`, the
 * shop's own collection, matched by English name folded, created when missing with its
 * Indonesian name and its place in the seed's order. Seeded once: a category a person has
 * edited is theirs.
 */
import type { Payload, PayloadRequest } from 'payload'

import { fold } from '../../import/vocabulary'
import { reqOf } from '../req'

export type CategorySeed = { readonly label: string; readonly labelId?: string }

export async function ensureCategory(
  payload: Payload,
  req: PayloadRequest,
  seed: CategorySeed,
  position: number,
): Promise<{ id: number; created: boolean }> {
  const { docs } = await payload.find({
    collection: 'categories',
    req,
    overrideAccess: true,
    depth: 0,
    limit: 1000,
    pagination: false,
  })
  const hit = docs.find((doc) => {
    const value = (doc as { label?: unknown }).label
    const text =
      typeof value === 'string' ? value : ((value as { en?: string } | undefined)?.en ?? '')
    return fold(text) === fold(seed.label)
  })
  if (hit) return { id: (hit as { id: number }).id, created: false }
  const created = (await payload.create({
    collection: 'categories',
    data: { label: seed.label, position } as never,
    req,
  })) as unknown as { id: number }
  if (seed.labelId && seed.labelId !== seed.label) {
    await payload.update({
      collection: 'categories',
      id: created.id,
      locale: 'id',
      data: { label: seed.labelId } as never,
      req: reqOf(payload, 'id', req.context),
    })
  }
  return { id: created.id, created: true }
}
