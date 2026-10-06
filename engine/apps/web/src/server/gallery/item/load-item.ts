/**
 * The gallery item's loader (5.2.b): one published work by `publicId`, projected to `ItemView`.
 * The read is `overrideAccess: false`, filtered `_status: 'published'`, so it runs as the
 * anonymous visitor — a draft, a malformed id or an unknown id is `null`. The select is explicit
 * and **never names a price or a staff field** (`askingPrice`, `notes`, `rights`, `physical`,
 * `cataloguing`, `legacy` are absent by construction; a db test asserts the result's JSON
 * carries no `askingPrice`).
 *
 * Cached under `'use cache'` by the work's own tag (`workTag`, the home's pattern): one
 * editorial invalidation re-renders the item page. An id that names no published work has no
 * tag to expire, so its `null` lives one short profile (`minutes`) — a work published a moment
 * ago is at its address within a minute, never months later.
 */
import { cacheLife } from 'next/cache'

import { cacheTags, workTag } from '@engine/cache'
import { cms } from '@engine/cms/instance'
import type { SiteLocale } from '@engine/config/sites'
import type { Payload } from 'payload'

import { dateTextOf } from '../catalogue/date-reading'
import { dimensionsLine } from '../catalogue/projection'
import { itemImagesOf } from './images'
import {
  slugOf,
  type ItemCredit,
  type ItemPlace,
  type ItemProvenance,
  type ItemReference,
  type ItemView,
} from './view-model'

/** The fields the item page shows, and nothing else — no staff field, no internal note. */
export const ITEM_SELECT = {
  title: true,
  originalTitle: true,
  originalTitleLanguage: true,
  objectType: true,
  makers: { maker: true, role: true, certainty: true },
  places: { place: true, role: true, primary: true },
  date: { precision: true, from: true, to: true, display: true },
  dimensions: { image: { height: true, width: true }, sheet: { height: true, width: true } },
  technique: true,
  colour: true,
  status: true,
  stockNumber: true,
  publicId: true,
  workUid: true,
  condition: {
    grade: true,
    notes: true,
    restoration: true,
    defects: { defect: true },
  },
  provenance: { holder: true, period: true, note: true },
  references: { citation: true, note: true },
  subjects: true,
  images: { media: true },
} as const

/** What a populated image carries: the page's file and alt, and what the viewer needs to find
 * its tiles or derivative. The original upload's `master` and the uploader never appear. */
export const ITEM_MEDIA_POPULATE = {
  url: true,
  filename: true,
  alt: true,
  width: true,
  height: true,
  role: true,
  provenance: true,
  assetId: true,
  iiif: { status: true },
  derivatives: { status: true },
} as const

const WORK_STATUSES = ['available', 'on-hold', 'sold'] as const

/** The largest public id the address accepts: nine digits, as the page's parser reads them. */
const PUBLIC_ID = /^[1-9]\d{0,8}$/

type Doc = Record<string, unknown>

const str = (value: unknown): string => (typeof value === 'string' ? value : '')
const strOf = (value: unknown): string | null => {
  const text = str(value)
  return text === '' ? null : text
}
const int = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) ? value : null
const rows = (value: unknown): readonly Doc[] =>
  Array.isArray(value)
    ? (value.filter((row) => typeof row === 'object' && row !== null) as Doc[])
    : []
const nameOf = (value: unknown): string =>
  typeof value === 'object' && value !== null ? str((value as Doc).name) : ''

const creditOf = (row: Doc): ItemCredit | null => {
  const name = nameOf(row.maker)
  return name === '' ? null : { name, role: str(row.role), certainty: str(row.certainty) }
}

const placeOf = (row: Doc): ItemPlace | null => {
  const name = nameOf(row.place)
  return name === '' ? null : { name, role: str(row.role), primary: row.primary === true }
}

const provenanceOf = (row: Doc): ItemProvenance | null => {
  const holder = strOf(row.holder)
  return holder === null ? null : { holder, period: strOf(row.period), note: strOf(row.note) }
}

const referenceOf = (row: Doc): ItemReference | null => {
  const citation = strOf(row.citation)
  return citation === null ? null : { citation, note: strOf(row.note) }
}

const present = <T>(value: T | null): value is T => value !== null

function viewOf(doc: Doc, unknownDateText: string): ItemView {
  const { images, primaryIndex } = itemImagesOf(rows(doc.images))
  const title = str(doc.title)
  const condition = (doc.condition ?? {}) as Doc
  const grade = condition.grade
  const places = rows(doc.places).map(placeOf).filter(present)
  return {
    publicId: int(doc.publicId) ?? 0,
    workUid: strOf(doc.workUid),
    stockNumber: strOf(doc.stockNumber),
    title,
    originalTitle: strOf(doc.originalTitle),
    originalTitleLanguage: strOf(doc.originalTitleLanguage),
    objectType: strOf(doc.objectType),
    maker: rows(doc.makers).map(creditOf).find(present) ?? null,
    // The primary place leads, the way a card names it.
    places: [...places.filter((p) => p.primary), ...places.filter((p) => !p.primary)],
    date: dateTextOf(doc.date ?? {}, unknownDateText),
    dimensions: dimensionsLine(doc.dimensions as Doc | null),
    technique: strOf(doc.technique),
    colouring: strOf(doc.colour),
    status: WORK_STATUSES.find((each) => each === doc.status) ?? 'available',
    conditionGrade:
      typeof grade === 'object' && grade !== null ? strOf((grade as Doc).label) : null,
    conditionNotes: strOf(condition.notes),
    conditionDefects: rows(condition.defects)
      .map((row) => strOf(row.defect))
      .filter(present),
    conditionRestoration: strOf(condition.restoration),
    provenance: rows(doc.provenance).map(provenanceOf).filter(present),
    references: rows(doc.references).map(referenceOf).filter(present),
    subjects: rows(doc.subjects)
      .map((term) => strOf(term.label))
      .filter(present),
    images,
    primaryIndex,
    slug: slugOf(title),
  }
}

/** The read itself, uncached, on the caller's Payload — the db test's door and the cache's body. */
export async function queryItem(
  payload: Payload,
  publicId: number,
  locale: SiteLocale,
  unknownDateText: string,
): Promise<ItemView | null> {
  const found = await payload.find({
    collection: 'works',
    overrideAccess: false,
    depth: 1,
    locale,
    limit: 1,
    pagination: false,
    where: { and: [{ publicId: { equals: publicId } }, { _status: { equals: 'published' } }] },
    select: ITEM_SELECT,
    populate: { media: ITEM_MEDIA_POPULATE },
  })
  const doc = found.docs[0]
  return doc === undefined ? null : viewOf(doc as unknown as Doc, unknownDateText)
}

async function cachedItem(
  publicId: number,
  locale: SiteLocale,
  unknownDateText: string,
): Promise<ItemView | null> {
  'use cache'
  const view = await queryItem(await cms(), publicId, locale, unknownDateText)
  if (view?.workUid) cacheTags([workTag(view.workUid)])
  else cacheLife('minutes')
  return view
}

/**
 * One published work by its public id, or `null` — unknown, malformed or draft. `unknownDateText`
 * is the lexicon's words for a work whose date reads unknown.
 */
export async function loadItem(
  publicId: string,
  locale: SiteLocale,
  unknownDateText: string,
): Promise<ItemView | null> {
  const id = publicId.trim()
  if (!PUBLIC_ID.test(id)) return null
  return cachedItem(Number(id), locale, unknownDateText)
}
