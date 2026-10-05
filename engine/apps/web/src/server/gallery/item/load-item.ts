/**
 * The gallery item's loader (5.2.b): one published work by `publicId`, projected to `ItemView`.
 * The read is `overrideAccess: false` so it runs as the anonymous visitor — a draft, a malformed
 * id or an unknown id is `null`. The select is explicit and **never names a price or a staff
 * field** (`askingPrice`, `notes`, `rights`, `physical`, `cataloguing`, `legacy` are absent by
 * construction, and a test asserts the result's JSON carries no `askingPrice`).
 *
 * Cached by each work's own tag (`workTag`), the home's pattern: one editorial invalidation
 * re-renders the item page. Media URLs are resolved here, in the view model, never in a
 * component (C9): the tile source is the image's IIIF `info.json` when the pipeline built the
 * pyramid, else the largest public derivative, else the media record's own file.
 */
import { cacheTags, workTag } from '@engine/cache'
import { cms } from '@engine/cms/instance'
import type { SiteLocale } from '@engine/config/sites'
import type { Payload } from 'payload'

import { dateTextOf } from '../catalogue/date-reading'
import { dimensionsLine } from '../catalogue/projection'
import {
  slugOf,
  type ItemCredit,
  type ItemImage,
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
  images: {
    caption: true,
    media: {
      url: true,
      alt: true,
      width: true,
      height: true,
      role: true,
      provenance: true,
      assetId: true,
      iiif: { status: true },
      derivatives: { status: true },
    },
  },
} as const

/** The long edge the capped public tiles stop at, the largest ladder rung (C9). */
const LARGEST_DERIVATIVE_WIDTH = 2400

const WORK_STATUSES = ['available', 'on-hold', 'sold'] as const

type Doc = Record<string, unknown>

const str = (value: unknown): string => (typeof value === 'string' ? value : '')
const strOf = (value: unknown): string | null => {
  const text = str(value)
  return text === '' ? null : text
}
const int = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) ? value : null
const rows = (value: unknown): readonly Doc[] =>
  Array.isArray(value) ? (value.filter((row) => typeof row === 'object' && row !== null) as Doc[]) : []

/** The media bucket's public base: the CDN in front of the public prefixes (C9). Empty when
 * the environment does not name one, and every image then answers with its own file. */
function mediaPublicUrl(): string {
  const url = process.env.MEDIA_PUBLIC_URL
  return typeof url === 'string' && url !== '' ? url.replace(/\/+$/, '') : ''
}

const isLowResolution = (width: number | null, height: number | null): boolean =>
  width !== null && height !== null && Math.max(width, height) < 1600 &&
  Math.max(width, height) > 0

/** The media record's public addresses: its deep-zoom tiles, its largest derivative, itself. */
function imageOf(media: Doc): ItemImage | null {
  const url = strOf(media.url)
  const alt = str(media.alt)
  if (url === null) return null
  const assetId = strOf(media.assetId)
  const base = mediaPublicUrl()
  const iiifReady = (media.iiif as Doc | undefined)?.status === 'ready'
  const derivativesReady = (media.derivatives as Doc | undefined)?.status === 'ready'
  const width = int(media.width)
  const height = int(media.height)
  // C9 `iiifInfoUrl()` / `derivativeKey()` shapes, restated here because `@engine/media`'s
  // exports do not reach the web app (the ticket owns no dependency change for it).
  const infoUrl =
    iiifReady && assetId !== null && base !== ''
      ? `${base}/iiif/${assetId}/info.json`
      : null
  const viewerSrc =
    infoUrl !== null
      ? infoUrl
      : derivativesReady && assetId !== null && base !== ''
        ? `${base}/derivatives/v1/${assetId}/${LARGEST_DERIVATIVE_WIDTH}.webp`
        : url
  return {
    url,
    alt,
    role: str(media.role) || 'recto',
    synthetic: str(media.provenance) !== '' && str(media.provenance) !== 'photograph',
    width,
    height,
    infoUrl,
    viewerSrc,
    lowResolution: isLowResolution(width, height),
  }
}

const creditOf = (row: Doc): ItemCredit | null => {
  const maker = row.maker
  if (typeof maker !== 'object' || maker === null) return null
  const name = str((maker as Doc).name)
  if (name === '') return null
  return { name, role: str(row.role), certainty: str(row.certainty) }
}

const placeOf = (row: Doc): ItemPlace | null => {
  const place = row.place
  if (typeof place !== 'object' || place === null) return null
  const name = str((place as Doc).name)
  if (name === '') return null
  return { name, role: str(row.role), primary: row.primary === true }
}

const provenanceOf = (row: Doc): ItemProvenance | null => {
  const holder = strOf(row.holder)
  if (holder === null) return null
  return { holder, period: strOf(row.period), note: strOf(row.note) }
}

const referenceOf = (row: Doc): ItemReference | null => {
  const citation = strOf(row.citation)
  if (citation === null) return null
  return { citation, note: strOf(row.note) }
}

function viewOf(doc: Doc, unknownDateText: string): ItemView {
  const images = rows(doc.images)
    .map((row) => row.media)
    .filter((media): media is Doc => typeof media === 'object' && media !== null)
    .map(imageOf)
    .filter((image): image is ItemImage => image !== null)
  const status = WORK_STATUSES.find((each) => each === doc.status) ?? 'available'
  const title = str(doc.title)
  const condition = (doc.condition ?? {}) as Doc
  const grade = condition.grade
  return {
    id: int(doc.id) ?? 0,
    publicId: int(doc.publicId) ?? 0,
    workUid: strOf(doc.workUid),
    stockNumber: strOf(doc.stockNumber),
    title,
    originalTitle: strOf(doc.originalTitle),
    originalTitleLanguage: strOf(doc.originalTitleLanguage),
    objectType: strOf(doc.objectType),
    maker: rows(doc.makers).map(creditOf).find((c): c is ItemCredit => c !== null) ?? null,
    places: rows(doc.places).map(placeOf).filter((p): p is ItemPlace => p !== null),
    date: dateTextOf(doc.date ?? {}, unknownDateText),
    dimensions: dimensionsLine(doc.dimensions as Record<string, unknown> | null),
    technique: strOf(doc.technique),
    colouring: strOf(doc.colour),
    status,
    conditionGrade:
      typeof grade === 'object' && grade !== null ? strOf((grade as Doc).label) : null,
    conditionNotes: strOf(condition.notes),
    conditionDefects: rows(condition.defects)
      .map((row) => strOf(row.defect))
      .filter((d): d is string => d !== null),
    conditionRestoration: strOf(condition.restoration),
    provenance: rows(doc.provenance).map(provenanceOf).filter((p): p is ItemProvenance => p !== null),
    references: rows(doc.references).map(referenceOf).filter((r): r is ItemReference => r !== null),
    subjects: rows(doc.subjects)
      .map((term) => strOf(term.label))
      .filter((s): s is string => s !== null),
    images,
    slug: slugOf(title),
  }
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
  if (!/^\d{1,9}$/.test(id)) return null
  return loadItemByPublicId(Number(id), locale, unknownDateText)
}

/** The read itself, uncached, on the caller's Payload — the db test's door and the cache's back. */
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
    where: { and: [{ publicId: { equals: publicId } }, { _status: { equals: 'published' } }] },
    select: ITEM_SELECT,
  })
  const doc = found.docs[0]
  if (doc === undefined) return null
  return viewOf(doc as unknown as Doc, unknownDateText)
}

async function loadItemByPublicId(
  publicId: number,
  locale: SiteLocale,
  unknownDateText: string,
): Promise<ItemView | null> {
  'use cache'
  const payload = await cms()
  const view = await queryItem(payload, publicId, locale, unknownDateText)
  if (view !== null && typeof view.workUid === 'string' && view.workUid) {
    cacheTags([workTag(view.workUid)])
  }
  return view
}
