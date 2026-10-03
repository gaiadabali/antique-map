/**
 * The vocabulary layer (DATA.md §2): the places the gallery's records name (the committed
 * gazetteer, plus the publisher-places and world places its place fields name), the condition
 * grades and the subject terms the legacy categories name, and `site-settings`' safe defaults.
 * It runs on every environment, production included, and is **seeded once**: a second run creates
 * nothing and overwrites nothing — a vocabulary a person has edited in the admin is theirs.
 *
 * Writes go through the Local API (overrideAccess by default, no user signed in) — the same
 * writes the importer's apply step makes. Nothing here is guessed: every name comes from a
 * committed file, and the files came from the legacy data.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { Payload, PayloadRequest } from 'payload'

import { reqOf } from '../req'
import { fold } from '../../import/vocabulary'

/** The settings a fresh environment starts on: the schema's own defaults, written once. */
const SETTINGS_DEFAULTS = {
  gallery: {
    ai: { chatEnabled: false, draftingEnabled: false, dailyBudgetUsd: 5, sessionTokenCap: 150000 },
  },
  shop: {
    ai: { chatEnabled: false, draftingEnabled: false, dailyBudgetUsd: 5, sessionTokenCap: 150000 },
    checkoutEnabled: true,
    delivery: { bands: [], freeOverIdr: 500000 },
    welcomeDiscount: '',
    orderExpiryMinutes: 60,
    storeAlerts: true,
  },
} as const

export type VocabularyReport = {
  places: { created: number; present: number }
  terms: { created: number; present: number }
  makers: { created: number; present: number }
  siteSettings: 'seeded' | 'present'
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

export function makerSeeds(): readonly MakerSeed[] {
  return (data('makers.json') as { makers: MakerSeed[] }).makers
}

/**
 * The maker line as a collector's sort reads it (the field is required, and the old site never
 * stated one): surname first, letters upper — "BLAEU, Willem Janszoon"; a particle rides with
 * the surname ("DE L' ISLE, Guillaume"); a trailing parenthetical ("(Ptolemy)", "(1588 – 1664)")
 * stays with the given name; a name that is already a sort line or an office's name sorts as it
 * is. Deterministic over the name, so the same seed always writes the same line.
 */
const ORGANISATION =
  /&|\b(Office|Society|Club|Association|Company|Press|Bureau|Survey|Admiralty)\b/
const PARTICLE = /\s(van|von|de|der|den|del|della|du|di|ten|ter|tot|zu)\b/i

export function sortNameOf(name: string): string {
  if (name.includes(',') || ORGANISATION.test(name)) return name
  const note = name.match(/\s*\([^)]*\)\s*$/)
  const base = (note?.index !== undefined ? name.slice(0, note.index) : name).trim()
  const suffix = note ? ` ${name.slice(note.index ?? 0).trim()}` : ''
  const particle = base.match(PARTICLE)
  const surnameStart =
    particle?.index !== undefined ? particle.index + 1 : base.lastIndexOf(' ') + 1
  const surname = base.slice(surnameStart).trim()
  const given = base.slice(0, surnameStart).trim()
  if (surname === '') return `${base.toUpperCase()}${suffix}`
  return `${surname.toUpperCase()}, ${given}${suffix}`
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
      req: reqOf(payload, 'id'),
    })
  }
  return true
}

export async function seedVocabulary(payload: Payload): Promise<VocabularyReport> {
  const req = reqOf(payload)
  const report: VocabularyReport = {
    places: { created: 0, present: 0 },
    terms: { created: 0, present: 0 },
    makers: { created: 0, present: 0 },
    siteSettings: 'present',
  }

  const slugToId = new Map<string, number>()
  for (const place of vocabularyPlaces()) {
    if (await upsertPlace(payload, req, place, slugToId)) report.places.created += 1
    else report.places.present += 1
  }

  for (const grade of gradeSeeds()) {
    if (await ensureTerm(payload, req, 'grade', grade.label, gradeDefinition(grade))) {
      report.terms.created += 1
    } else report.terms.present += 1
  }
  for (const subject of subjectSeeds()) {
    if (await ensureTerm(payload, req, 'subject', subject.label, undefined, subject.labelId)) {
      report.terms.created += 1
    } else report.terms.present += 1
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
    if (existing.docs.length > 0) {
      report.makers.present += 1
      continue
    }
    await payload.create({
      collection: 'makers',
      data: { name: maker.name, sortName: sortNameOf(maker.name) } as never,
      req,
    })
    report.makers.created += 1
  }

  const settings = (await payload.findGlobal({ slug: 'site-settings', req })) as unknown as {
    id?: number
    updatedAt?: string
  }
  if (settings?.updatedAt !== undefined) {
    report.siteSettings = 'present'
  } else {
    await payload.updateGlobal({ slug: 'site-settings', data: SETTINGS_DEFAULTS as never, req })
    report.siteSettings = 'seeded'
  }
  return report
}

function gradeDefinition(grade: GradeSeed): Record<string, unknown> {
  return { definition: grade.definition }
}

/** Creates the term when no term of that kind folds to the label; answers whether it created. */
async function ensureTerm(
  payload: Payload,
  req: PayloadRequest,
  kind: string,
  label: string,
  extra?: Record<string, unknown>,
  labelId?: string,
): Promise<boolean> {
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
  if (hit) return false
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
      req: reqOf(payload, 'id'),
    })
  }
  return true
}
