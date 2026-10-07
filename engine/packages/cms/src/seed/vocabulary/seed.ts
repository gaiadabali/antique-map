/**
 * The vocabulary layer (DATA.md §2): the places the gallery's records name (the committed
 * gazetteer, plus the publisher-places and world places its place fields name), the condition
 * grades and the subject terms the legacy categories name, the shop's product categories, and
 * `site-settings`' safe defaults.
 * It runs on every environment, production included, and is **seeded once**: a second run creates
 * nothing and overwrites nothing — a vocabulary a person has edited in the admin is theirs.
 *
 * Writes go through the Local API (overrideAccess by default, no user signed in) — the same
 * writes the importer's apply step makes. Nothing here is guessed: every name comes from a
 * committed file, and the files came from the legacy data.
 *
 * With `publish` (the CLI's `--publish`), the rows it names that are still drafts are published
 * once seeded, and nothing else about them changes (`./publish`): the gallery reads published
 * vocabulary only, so the search's historical names (Batavia → Jakarta) need it.
 *
 * It runs outside any Next request, so every write's request carries a cache collector for the
 * cache hooks (places, makers and terms expire the gallery's listings; site-settings its settings
 * tags): the caller's (the CLI's, posted once the run returns — `../../import/cli-cache`), or with
 * none a batch of its own that posts nothing — a fresh install has nothing cached, and a live site
 * re-reads on its next deploy or edit.
 */
import { invalidationBatch } from '@engine/cache'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Payload, PayloadRequest, RequestContext } from 'payload'

import { reqOf } from '../req'
import { fold } from '../../import/vocabulary'
import { TERM_KINDS } from '../../collections/terms/kinds'
import { fillKey, publishVocabulary, type PublishReport } from './publish'
import { SETTINGS_DEFAULTS } from './settings'
import { sortNameOf } from './sort-name'

export { sortNameOf } from './sort-name'

export type VocabularyReport = {
  places: { created: number; present: number }
  terms: { created: number; present: number }
  makers: { created: number; present: number }
  siteSettings: 'seeded' | 'present'
  /** With `publish`: the seeded rows this run moved from draft to published (`./publish`). */
  published?: PublishReport
}

type GazetteerPlace = {
  slug: string
  name: { en: string; id?: string }
  type: string
  parent?: string
  historicalNames?: ReadonlyArray<{ name: string; language: string; period: string }>
  geo?: {
    lat: number
    lng: number
    bbox?: { west: number; south: number; east: number; north: number }
  }
}

type GradeSeed = {
  label: string
  equivalent: string
  definition: { en: string; id: string }
}
type SubjectSeed = { label: string; labelId?: string }
type MakerSeed = { name: string; roles?: readonly string[] }

const here = (file: string) => join(import.meta.dirname, file)
const data = (file: string) => JSON.parse(readFileSync(here(join('data', file)), 'utf8'))

function loadGazetteer(): readonly GazetteerPlace[] {
  const json = JSON.parse(readFileSync(here('../gazetteer.json'), 'utf8')) as {
    places: GazetteerPlace[]
  }
  return json.places
}

/** Reads every place the two committed files name, gazetteer first (parents before children). */
export function vocabularyPlaces(): readonly GazetteerPlace[] {
  return [...loadGazetteer(), ...(data('places.json') as { places: GazetteerPlace[] }).places]
}

export function gradeSeeds(): readonly GradeSeed[] {
  return (data('grades.json') as { grades: GradeSeed[] }).grades
}

export function subjectSeeds(): readonly SubjectSeed[] {
  return (data('terms.json') as { subjects: SubjectSeed[] }).subjects
}

/** The shop's categories (DATA.md §1): the products sheet's `category` column matches them. */
export function categorySeeds(): readonly SubjectSeed[] {
  return (data('categories.json') as { categories: SubjectSeed[] }).categories
}

/** The `category` kind arrives with TASKS.md 3.2.a; until then the categories are subject terms. */
const CATEGORY_KIND = (TERM_KINDS as readonly string[]).includes('category')
  ? 'category'
  : 'subject'

export function makerSeeds(): readonly MakerSeed[] {
  return (data('makers.json') as { makers: MakerSeed[] }).makers
}

/** One match-or-create helper: finds by slug, creates what is missing. */
async function upsertPlace(
  payload: Payload,
  req: PayloadRequest,
  place: GazetteerPlace,
  slugToId: Map<string, number>,
): Promise<boolean> {
  const existing = await payload.find({
    collection: 'places',
    req,
    overrideAccess: true,
    depth: 0,
    limit: 1,
    where: { slug: { equals: place.slug } },
  })
  if (existing.docs.length > 0) {
    slugToId.set(place.slug, existing.docs[0]!.id as number)
    return false
  }
  const created = (await payload.create({
    collection: 'places',
    data: {
      slug: place.slug,
      name: place.name.en,
      ...(place.type ? { type: place.type } : {}),
      ...(place.parent && slugToId.has(place.parent) ? { parent: slugToId.get(place.parent) } : {}),
      ...(place.historicalNames ? { historicalNames: [...place.historicalNames] } : {}),
      ...(place.geo ? { geo: place.geo } : {}),
    } as never,
    req,
  })) as unknown as { id: number }
  slugToId.set(place.slug, created.id)
  if (place.name.id && place.name.id !== place.name.en) {
    await payload.update({
      collection: 'places',
      id: created.id,
      locale: 'id',
      data: { name: place.name.id, slug: place.slug } as never,
      req: reqOf(payload, 'id', req.context),
    })
  }
  return { id: created.id, created: true }
}

export async function seedVocabulary(
  payload: Payload,
  context?: RequestContext,
  options: { publish?: boolean } = {},
): Promise<VocabularyReport> {
  const req = reqOf(payload, 'en', context ?? invalidationBatch().context())
  const report: VocabularyReport = {
    places: { created: 0, present: 0 },
    terms: { created: 0, present: 0 },
    makers: { created: 0, present: 0 },
    siteSettings: 'present',
  }
  const count = (tally: { created: number; present: number }, created: boolean) => {
    if (created) tally.created += 1
    else tally.present += 1
  }

  const slugToId = new Map<string, number>()
  for (const place of vocabularyPlaces()) {
    count(report.places, await upsertPlace(payload, req, place, slugToId))
  }

  // The seeded terms and makers, found or created, for the publish step; a grade's equivalent
  // is a publish-only requirement, filled there where the row has none (`./publish`).
  const termIds: number[] = []
  const makerIds: number[] = []
  const fill = new Map<string, Record<string, string>>()
  for (const grade of gradeSeeds()) {
    const term = await ensureTerm(payload, req, 'grade', grade.label, gradeFields(grade))
    count(report.terms, term.created)
    termIds.push(term.id)
    fill.set(fillKey('terms', term.id), { equivalent: grade.equivalent })
  }
  const subjects = [
    ...subjectSeeds().map((seed) => ({ kind: 'subject', seed })),
    ...categorySeeds().map((seed) => ({ kind: CATEGORY_KIND, seed })),
  ]
  for (const { kind, seed } of subjects) {
    const term = await ensureTerm(payload, req, kind, seed.label, undefined, seed.labelId)
    count(report.terms, term.created)
    termIds.push(term.id)
  }

  for (const maker of makerSeeds()) {
    const existing = await payload.find({
      collection: 'makers',
      req,
      overrideAccess: true,
      depth: 0,
      limit: 1,
      where: { name: { equals: maker.name } },
    })
    const found = existing.docs[0] as { id: number } | undefined
    const id = found
      ? found.id
      : (
          (await payload.create({
            collection: 'makers',
            data: { name: maker.name, sortName: sortNameOf(maker.name) } as never,
            req,
          })) as unknown as { id: number }
        ).id
    count(report.makers, found === undefined)
    makerIds.push(id)
  }

  const settings = (await payload.findGlobal({ slug: 'site-settings', req })) as unknown as {
    id?: number
    updatedAt?: string
  }
  if (settings?.updatedAt !== undefined) {
    report.siteSettings = 'present'
  } else {
    // The settings hook's tags go to the collector `req` carries (the header says whose).
    await payload.updateGlobal({ slug: 'site-settings', data: SETTINGS_DEFAULTS as never, req })
    report.siteSettings = 'seeded'
  }

  if (options.publish) {
    report.published = await publishVocabulary(payload, req, {
      places: [...slugToId.values()],
      terms: termIds,
      makers: makerIds,
      fill,
    })
  }
  return report
}

function gradeFields(grade: GradeSeed): Record<string, unknown> {
  return { definition: grade.definition, equivalent: grade.equivalent }
}

/** Creates the term when no term of that kind folds to the label; answers its id, and whether
 * it created it. */
async function ensureTerm(
  payload: Payload,
  req: PayloadRequest,
  kind: string,
  label: string,
  extra?: Record<string, unknown>,
  labelId?: string,
): Promise<{ id: number; created: boolean }> {
  const { docs } = await payload.find({
    collection: 'terms',
    req,
    overrideAccess: true,
    depth: 0,
    limit: 1000,
    where: { kind: { equals: kind } },
  })
  const hit = docs.find((doc) => {
    const value = (doc as { label?: unknown }).label
    const text =
      typeof value === 'string' ? value : ((value as { en?: string } | undefined)?.en ?? '')
    return fold(text) === fold(label)
  })
  if (hit) return { id: (hit as { id: number }).id, created: false }
  const created = (await payload.create({
    collection: 'terms',
    data: { kind, label } as never,
    req,
  })) as unknown as { id: number }
  if (extra || labelId) {
    await payload.update({
      collection: 'terms',
      id: created.id,
      data: extra ?? {},
      req,
    })
  }
  if (labelId) {
    await payload.update({
      collection: 'terms',
      id: created.id,
      locale: 'id',
      data: { label: labelId } as never,
      req: reqOf(payload, 'id', req.context),
    })
  }
  return { id: created.id, created: true }
}
