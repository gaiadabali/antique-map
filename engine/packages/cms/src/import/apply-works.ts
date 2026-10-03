/**
 * Applying the antiques rows (DATA.md §3): upserts of `works` keyed by stock number, through the
 * Local API with the run's transaction. Only the fields the row carries go into the update; the
 * legacy prices go nowhere — DATA.md §2 says the old USD prices are not loaded, and no field here
 * would carry one. Images are turned into `media` rows keyed by filename, so a second run links
 * the same rows and changes nothing.
 */
import type { PayloadRequest } from 'payload'
import { ValidationError } from 'payload'

import type { UpsertContext } from './apply'
import type { Problem } from './types'
import { changes } from './diff'
import type { WritableRow } from './plan'
import type { UpsertResult } from './apply'

type Doc = Record<string, unknown> & { id: number }

/** The first row of an array read as ids, in order — how a work's images are compared. */
const imageIds = (doc: Doc): readonly number[] =>
  ((doc.images as Array<{ media?: unknown }> | null) ?? []).map((row) =>
    typeof row?.media === 'object' && row.media !== null ? (row.media as Doc).id : (row?.media as number),
  )

/** The maker ids+roles the work credits, as they are compared. */
const credits = (rows: unknown): unknown =>
  ((rows as Array<Record<string, unknown>> | null) ?? []).map((row) => ({
    maker: idOf(row.maker),
    role: row.role,
    certainty: row.certainty,
  }))

const idOf = (value: unknown): unknown => {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'object' && 'id' in (value as object)) return (value as Doc).id
  return value
}

/** Creates or finds the `media` row for one image file, keyed by filename, alt from the title. */
export async function ensureMedia(
  ctx: { payload: PayloadRequest['payload']; req: PayloadRequest },
  fileName: string,
  path: string,
  alt: string,
  role: string,
): Promise<number> {
  const { docs } = await ctx.payload.find({
    collection: 'media',
    overrideAccess: true,
    req: ctx.req,
    depth: 0,
    limit: 1,
    where: { filename: { equals: fileName } },
  })
  if (docs.length > 0) return docs[0]!.id as number
  const created = (await ctx.payload.create({
    collection: 'media',
    data: { alt: { en: alt }, subject: 'work', role, provenance: 'photograph' } as never,
    filePath: path,
    req: ctx.req,
  })) as unknown as Doc
  return created.id as number
}

/** Applies one antiques row: a create, an update of only what changed, or nothing. */
export async function applyWork(
  ctx: UpsertContext,
  planned: WritableRow & { collection: 'works' },
): Promise<UpsertResult> {
  const { payload, req } = ctx
  const data: Record<string, unknown> = { ...planned.data }
  // `relatedStockNumber` is the products template's link to the original; a work row never carries it.
  delete data.relatedStockNumber

  const images: Array<{ media: number }> = []
  for (const [index, file] of (planned.imageFiles ?? []).entries()) {
    try {
      images.push({
        media: await ensureMedia(
          { payload, req },
          fileNameOf(file),
          file,
          altFor(data, index),
          index === 0 ? 'recto' : 'detail',
        ),
      })
    } catch {
      // A file that is not there holds the row for a person; the rest of the file goes on.
      return {
        outcome: 'held',
        problem: {
          column: 'image_files',
          problem: `Could not read the image file '${file}'.`,
          fix: 'Check the path (it is relative to the data folder) and import again.',
        },
      }
    }
  }

  const { docs } = await payload.find({
    collection: 'works',
    overrideAccess: true,
    req,
    depth: 0,
    draft: true,
    limit: 1,
    where: { stockNumber: { equals: planned.key } },
  })
  const existing = docs[0] as Doc | undefined

  if (!existing) {
    const payloadData: Record<string, unknown> = {
      ...data,
      ...(images.length > 0 ? { images } : {}),
      _status: ctx.publish ? 'published' : 'draft',
    }
    try {
      await payload.create({ collection: 'works', data: payloadData as never, req })
      return { outcome: 'new' }
    } catch (error) {
      return failure(error)
    }
  }

  const incoming: Record<string, unknown> = { ...data }
  if (images.length > 0) {
    const current = imageIds(existing)
    if (
      current.length !== images.length ||
      images.some((row, i) => row.media !== current[i])
    ) {
      incoming.images = images
    }
  }
  if (incoming.makers !== undefined) incoming.makers = credits(incoming.makers)
  if (incoming.places !== undefined) {
    incoming.places = ((incoming.places as Array<Record<string, unknown>>) ?? []).map((row) => ({
      place: row.place,
      role: row.role,
      primary: row.primary,
    }))
  }
  if (ctx.publish && existing._status !== 'published') incoming._status = 'published'

  const changed = changes(existing, incoming)
  if (changed.length === 0) return { outcome: 'unchanged', changes: changed }

  const update: Record<string, unknown> = {}
  for (const { column } of changed) update[column] = incoming[column]
  try {
    await payload.update({ collection: 'works', id: existing.id, data: update as never, req })
    return { outcome: 'updated', changes: changed }
  } catch (error) {
    return failure(error)
  }
}

const altFor = (data: Record<string, unknown>, index: number): string => {
  const title = data.title as { en?: string } | undefined
  const base = title?.en ?? 'The work'
  return index === 0 ? `${base} — the whole sheet` : `${base} — detail`
}

const fileNameOf = (file: string) => file.split(/[\\/]/).pop() ?? file

/** A Payload refusal is a plain problem with the field named; a guarded publish is held. */
function failure(error: unknown): UpsertResult {
  if (error instanceof ValidationError) {
    const first = error.data?.errors?.[0]
    const problem: Problem = {
      column: first?.path,
      problem: String(first?.message ?? 'The row was refused.'),
    }
    if (String(first?.message ?? '').includes('publish')) {
      return { outcome: 'held', problem: { ...problem, fix: 'Complete the record, then publish it in the CMS.' } }
    }
    return { outcome: 'rejected', problem }
  }
  throw error
}
