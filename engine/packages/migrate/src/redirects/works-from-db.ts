/**
 * The builder's `WorkLookup[]` read from the live `works` collection (9.4load — the loader needs
 * every work, not only the published ones: an unpublished work's old URL must answer "not
 * published" (`rules.ts` `galleryProductRule`), never "no work for legacy id", so this reads both
 * states and lets the builder's rules decide.
 *
 * `overrideAccess: true`, with the why here: this runs as an internal migration CLI, never for a
 * visitor's request (`AGENTS.md`'s "public reads are published-only" governs page loaders, not
 * this). Only `legacy.productId`, `publicId`, `title` and `_status` leave the database — no price,
 * no staff note, nothing else a work carries.
 */
import type { Payload } from 'payload'

import type { WorkLookup } from './rules'

const PAGE_SIZE = 1000

/** Letters NFKD does not take apart into a base letter and a mark (`@engine/cms/fields/slug`'s
 * `slugify`, not exported to this package — restated here, as `apps/web`'s `slugOf` already does,
 * rather than add an export this ticket does not own). */
const LETTERS: Readonly<Record<string, string>> = {
  ß: 'ss',
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  ł: 'l',
  đ: 'd',
  ð: 'd',
  þ: 'th',
  ı: 'i',
}

const SLUG_MAX_LENGTH = 96

/** A work's slug, exactly as the gallery item page derives it from the title at read time. */
export function slugOf(title: string): string {
  const ascii = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[ßæœøłđðþı]/g, (letter) => LETTERS[letter] ?? '')
    .replace(/['’ʼ`]/g, '')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (ascii === '') return 'antique'
  if (ascii.length <= SLUG_MAX_LENGTH) return ascii
  const cut = ascii.slice(0, SLUG_MAX_LENGTH + 1)
  const hyphen = cut.lastIndexOf('-')
  return (hyphen > 0 ? cut.slice(0, hyphen) : cut.slice(0, SLUG_MAX_LENGTH)).replace(/-+$/, '')
}

type WorkRow = {
  readonly legacy?: { readonly productId?: number | null } | null
  readonly publicId?: number | null
  readonly title?: string | null
  readonly _status?: string | null
}

/**
 * Every work that can ever be a redirect target or source: one with a legacy id (the "from" side)
 * or a `publicId` (the "to" side) is kept; a work with neither answers no legacy URL and would
 * never be found by `findWork()`, so it is left out.
 */
export async function worksFromDb(payload: Payload): Promise<WorkLookup[]> {
  const works: WorkLookup[] = []
  for (let page = 1; ; page += 1) {
    const result = await payload.find({
      collection: 'works',
      select: { legacy: { productId: true }, publicId: true, title: true, _status: true },
      depth: 0,
      sort: 'id',
      limit: PAGE_SIZE,
      page,
      pagination: true,
      // Internal migration tool, not a visitor's request — see the file comment.
      overrideAccess: true,
    })
    for (const doc of result.docs as unknown as WorkRow[]) {
      const legacyId = doc.legacy?.productId
      const publicId = doc.publicId
      const title = doc.title
      if (typeof legacyId !== 'number' || typeof publicId !== 'number') continue
      works.push({
        legacyId,
        publicId,
        slug: slugOf(title ?? ''),
        published: doc._status === 'published',
      })
    }
    if (!result.hasNextPage) return works
  }
}
