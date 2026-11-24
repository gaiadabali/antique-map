/**
 * What the client-preview seed's steps share (`./index`): the request each write rides on, a
 * read of every shop record in a collection, and a relation's id. Every write goes through
 * Payload with the caller's cache collector context (`../req`), as the other seeds' do.
 */
import type { Payload, RequestContext, Where } from 'payload'

import { shopOnly } from '../../site'
import { reqOf } from '../req'

export type Doc = Record<string, unknown> & { id: number }

export type Step = {
  readonly payload: Payload
  readonly context: RequestContext
}

/** The write options of a step, in `locale`. */
export function writeOf(step: Step, locale: 'en' | 'id' = 'en') {
  return {
    overrideAccess: true,
    locale,
    req: reqOf(step.payload, locale, step.context),
  } as const
}

/** Every shop record of `collection` (drafts too), in id order, English. */
export async function allOf(step: Step, collection: string, where?: Where): Promise<Doc[]> {
  const scope = shopOnly(step.payload, collection)
  const clauses = [scope, where].filter((each): each is Where => each != null)
  const found = await step.payload.find({
    collection: collection as never,
    ...writeOf(step),
    draft: true,
    depth: 0,
    limit: 0,
    pagination: false,
    sort: 'id',
    ...(clauses.length > 0 ? { where: { and: clauses } } : {}),
  })
  return found.docs as unknown as Doc[]
}

/** A relation's id, whether it came populated or not. */
export function idOf(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && typeof (value as Doc).id === 'number') {
    return (value as Doc).id
  }
  return null
}

/** The first picture of the product at `slug`, or null. */
export async function firstImageOf(step: Step, slug: string): Promise<number | null> {
  const [product] = await allOf(step, 'products', { slug: { equals: slug } })
  const images = (product?.images ?? []) as Array<{ image?: unknown }>
  return idOf(images[0]?.image)
}

export const sameIds = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((each, at) => each === b[at])
