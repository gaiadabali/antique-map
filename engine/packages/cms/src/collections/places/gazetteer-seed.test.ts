/**
 * TASKS.md 8.1.d: the gazetteer seed (`../../seed/gazetteer.json`, TASKS.md 2.4.c) passes the
 * `places` collection's own rules — addresses, a tree with no loop, historical names, geo — and
 * holds what the two docs it encodes ask for: EXPERIENCE-GALLERY.md §2's
 * hierarchy and ARCHITECTURE.md §8's historical ↔ modern pairs.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { ancestryProblem, MAX_PLACE_DEPTH } from '../../validators/place-ancestry'
import { geoErrors, type Geo } from '../../validators/place-geo'
import {
  historicalNameErrors,
  nameKey,
  type HistoricalName,
} from '../../validators/place-historical-names'
import { slugify, SLUG_PATTERN } from '../../fields/slug'
import { PLACE_TYPES } from './place-types'

type SeedPlace = {
  slug: string
  parent: string | null
  type: string
  name: { en: string; id: string }
  translationStatus: { en: string; id: string }
  historicalNames: HistoricalName[]
  geo: Geo | null
}

const here = path.dirname(fileURLToPath(import.meta.url))

const seed = JSON.parse(
  fs.readFileSync(path.join(here, '..', '..', 'seed', 'gazetteer.json'), 'utf8'),
) as { shape: number; places: SeedPlace[] }
const places = seed.places
const bySlug = new Map(places.map((place) => [place.slug, place]))
const childrenOf = (slug: string | null) =>
  places.filter((place) => place.parent === slug).map((place) => place.slug)

/** Every name a search would find the place under: its modern names and its historical ones. */
const namesOf = (place: SeedPlace) =>
  new Set(
    [place.name.en, place.name.id, ...place.historicalNames.map((h) => h.name ?? '')].map(nameKey),
  )

describe('the gazetteer seed passes the places collection’s rules', () => {
  it('gives every place a unique address in C10’s shape', () => {
    expect(seed.shape).toBe(1)
    for (const place of places) expect(place.slug).toMatch(SLUG_PATTERN)
    expect(bySlug.size).toBe(places.length)
  })

  it('lists every parent before its children, and has no loop', () => {
    const seen = new Set<string>()
    for (const place of places) {
      if (place.parent !== null) expect(seen.has(place.parent), place.slug).toBe(true)
      seen.add(place.slug)
      const problem = ancestryProblem({
        id: place.slug,
        parent: place.parent,
        parentOf: (id) => bySlug.get(String(id))?.parent,
        maxDepth: MAX_PLACE_DEPTH,
      })
      expect(problem, place.slug).toBeNull()
    }
  })

  it('names each place in English and Indonesian, the Indonesian marked for review', () => {
    for (const place of places) {
      expect(place.name.en.trim(), place.slug).not.toBe('')
      expect(place.name.id.trim(), place.slug).not.toBe('')
      expect(place.translationStatus).toEqual({ en: 'entered', id: 'machine' })
      expect(PLACE_TYPES as readonly string[]).toContain(place.type)
    }
  })

  it('holds valid historical names and coordinates', () => {
    for (const place of places) {
      expect(historicalNameErrors(place.historicalNames), place.slug).toEqual([])
      expect(geoErrors(place.geo), place.slug).toEqual({})
    }
  })

  it('takes each address from a name the place goes by (whole words of it)', () => {
    for (const place of places) {
      const spellings = [...namesOf(place)].map((name) => `-${slugify(name)}-`)
      const found = spellings.some((spelling) => spelling.includes(`-${place.slug}-`))
      expect(found, `${place.slug} in ${spellings.join(' ')}`).toBe(true)
    }
  })
})

describe('the gazetteer seed holds EXPERIENCE-GALLERY.md §2’s hierarchy', () => {
  it('has §2’s top level, in its order', () => {
    expect(childrenOf(null)).toEqual([
      'sumatra',
      'java',
      'bali-lombok',
      'nusa-tenggara',
      'borneo',
      'sulawesi',
      'maluku',
      'papua',
      'beyond-indonesia',
    ])
  })

  it('has the places §2 lists under each', () => {
    expect(childrenOf('sumatra')).toEqual(['aceh', 'padang', 'palembang'])
    expect(childrenOf('java')).toEqual([
      'batavia',
      'banten',
      'buitenzorg',
      'semarang',
      'yogyakarta',
      'surakarta',
      'surabaya',
    ])
    expect(childrenOf('bali-lombok')).toEqual(['bali', 'lombok'])
    expect(childrenOf('nusa-tenggara')).toEqual(['flores', 'komodo', 'timor'])
    expect(childrenOf('timor')).toEqual(['kupang'])
    expect(childrenOf('sulawesi')).toEqual(['makassar'])
    expect(childrenOf('maluku')).toEqual(['banda', 'ambon', 'ternate-tidore'])
    expect(childrenOf('beyond-indonesia')).toEqual([
      'singapore',
      'malaysia-the-straits',
      'philippines',
      'mainland-southeast-asia',
      'east-asia',
      'indian-ocean',
      'australia-pacific',
    ])
  })

  it('makes the gazetteer paths the docs write: java/batavia, nusa-tenggara/timor/kupang', () => {
    const pathOf = (slug: string): string[] => {
      const place = bySlug.get(slug)!
      return place.parent === null ? [slug] : [...pathOf(place.parent), slug]
    }
    expect(pathOf('batavia').join('/')).toBe('java/batavia')
    expect(pathOf('kupang').join('/')).toBe('nusa-tenggara/timor/kupang')
  })
})

describe('the gazetteer seed holds ARCHITECTURE.md §8’s historical ↔ modern names', () => {
  const PAIRS: Array<[historical: string, modern: string]> = [
    ['Batavia', 'Jakarta'],
    ['Celebes', 'Sulawesi'],
    ['Iava', 'Java'],
    ['Moluccas', 'Maluku'],
    ['Borneo', 'Kalimantan'],
    ['Nieuw-Guinea', 'Papua'],
    ['Macassar', 'Makassar'],
    ['Siam', 'Thailand'],
    ['Ceylon', 'Sri Lanka'],
    ['Formosa', 'Taiwan'],
  ]

  it.each(PAIRS)('finds %s and %s as one place', (historical, modern) => {
    const matches = places.filter((place) => {
      const names = namesOf(place)
      return names.has(nameKey(historical)) && names.has(nameKey(modern))
    })
    expect(matches).toHaveLength(1)
    const [place] = matches
    expect([place!.name.en, place!.name.id]).toContain(modern)
    expect(place!.historicalNames.map((h) => h.name)).toContain(historical)
  })
})
