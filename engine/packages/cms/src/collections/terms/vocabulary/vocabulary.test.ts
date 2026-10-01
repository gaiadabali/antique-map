/**
 * The vocabulary's shared pieces: slugs (derived once, C10's shape), the shared validators and
 * who may publish. The saves themselves are proved on a database (`places/vocabulary.db.test`).
 */
import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { refuseContributorPublish, VOCABULARY_ACCESS } from './access'
import { isWebUrl, requiredInDefaultLocale, requiredToPublish } from './fields'
import { nextFreeSlug, slugField, slugify, SLUG_MAX_LENGTH, SLUG_PATTERN } from './slug'

describe('slugify', () => {
  it('writes C10’s segment shape from any Latin name', () => {
    const cases: Array<[string, string]> = [
      ['Batavia', 'batavia'],
      ['Ternate & Tidore', 'ternate-tidore'],
      ['Timor–Kupang', 'timor-kupang'],
      ['Suárez', 'suarez'],
      ['François Valentijn', 'francois-valentijn'],
      ["'s-Gravenhage", 's-gravenhage'],
      ['Tooley (Australia)', 'tooley-australia'],
      ['Straße', 'strasse'],
      ['Ærø', 'aero'],
      ['VG+', 'vg-plus'],
      ['As-is', 'as-is'],
      ['  Malaysia &  the Straits  ', 'malaysia-the-straits'],
    ]
    for (const [name, expected] of cases) {
      expect(slugify(name)).toBe(expected)
      expect(expected).toMatch(SLUG_PATTERN)
    }
  })

  it('keeps VG+ and VG apart', () => {
    expect(slugify('VG+')).not.toBe(slugify('VG'))
  })

  it('is empty for a name with nothing Latin in it', () => {
    expect(slugify('巴達維亞')).toBe('')
    expect(slugify('—')).toBe('')
  })

  it('cuts a long name at a hyphen', () => {
    const slug = slugify('Kaart van het Eyland Bali '.repeat(10))
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH)
    expect(slug).toMatch(SLUG_PATTERN)
  })
})

describe('nextFreeSlug', () => {
  it('takes the base, else the first free numbered one', async () => {
    const taken = new Set(['java', 'java-2'])
    const isTaken = async (candidate: string) => taken.has(candidate)
    expect(await nextFreeSlug('bali', isTaken)).toBe('bali')
    expect(await nextFreeSlug('java', isTaken)).toBe('java-3')
  })

  it('gives up after its attempts rather than looping', async () => {
    expect(await nextFreeSlug('x', async () => true, 3)).toBeNull()
  })
})

describe('the slug field', () => {
  type Hook = (args: Record<string, unknown>) => Promise<unknown>
  const field = slugField({ from: 'name' })
  const derive = field.hooks!.beforeValidate![0] as unknown as Hook
  const req = { payload: { count: async () => ({ totalDocs: 0 }) } }
  const collection = { slug: 'places' }

  it('is derived from the name on the first save', async () => {
    expect(await derive({ collection, req, siblingData: { name: 'Bali & Lombok' } })).toBe(
      'bali-lombok',
    )
  })

  it('is never re-derived when the name changes', async () => {
    const originalDoc = { id: 1, ['slug']: 'batavia' }
    expect(await derive({ collection, req, originalDoc, siblingData: { name: 'Jakarta' } })).toBe(
      'batavia',
    )
  })

  it('keeps its value when an edit clears it, and normalises one typed by hand', async () => {
    const originalDoc = { id: 1, ['slug']: 'batavia' }
    expect(await derive({ collection, req, originalDoc, value: '', siblingData: {} })).toBe(
      'batavia',
    )
    expect(await derive({ collection, req, originalDoc, value: 'Oud Batavia' })).toBe('oud-batavia')
  })

  it('is unique in the collection, or within its scope', () => {
    expect(field.unique).toBe(true)
    expect(slugField({ from: 'label', scope: 'kind' }).unique).toBe(false)
  })
})

describe('shared validators', () => {
  const at = (locale: string, operation: 'create' | 'update') =>
    ({
      operation,
      req: { locale, payload: { config: { localization: { defaultLocale: 'en' } } } },
    }) as never

  it('require a name on create and in the default locale, not in a translation', () => {
    const validate = requiredInDefaultLocale('Give the name.')
    expect(validate('', at('en', 'update'))).toBe('Give the name.')
    expect(validate('', at('id', 'create'))).toBe('Give the name.')
    expect(validate('', at('id', 'update'))).toBe(true)
    expect(validate('Jawa', at('id', 'update'))).toBe(true)
  })

  it('require a field to publish, never to save a draft', () => {
    const validate = requiredToPublish('Give the citation.')
    expect(validate('', { data: { _status: 'published' } } as never)).toBe('Give the citation.')
    expect(validate('', { data: { _status: 'draft' } } as never)).toBe(true)
    expect(validate('Koeman 1967', { data: { _status: 'published' } } as never)).toBe(true)
  })

  it('take only absolute web addresses', () => {
    expect(isWebUrl('https://www.wikidata.org/wiki/Q1384583')).toBe(true)
    expect(isWebUrl('http://vocab.getty.edu/page/ulan/500115589')).toBe(true)
    expect(isWebUrl('http://vocab.getty.edu/x', { httpsOnly: true })).toBe(false)
    for (const bad of ['javascript:alert(1)', '/makers/valentijn', 'wikidata', 'https://a b.c']) {
      expect(isWebUrl(bad)).toBe(false)
    }
  })
})

describe('who writes and publishes the vocabulary', () => {
  const as = (user: unknown) => ({ req: { user } as unknown as PayloadRequest })
  const staff = (...roles: string[]) => ({ collection: 'users', roles })
  const publish = (user: unknown) =>
    refuseContributorPublish({
      data: { _status: 'published' },
      req: { user } as unknown as PayloadRequest,
    } as never)

  it('lets cataloguing roles and contributors write, admins and managers delete', () => {
    expect(VOCABULARY_ACCESS.create(as(staff('contributor')))).toBe(true)
    expect(VOCABULARY_ACCESS.update(as(staff('cataloguer')))).toBe(true)
    expect(VOCABULARY_ACCESS.update(as(staff('editor')))).toBe(false)
    expect(VOCABULARY_ACCESS.update(as(staff('analyst')))).toBe(false)
    expect(VOCABULARY_ACCESS.delete(as(staff('cataloguer')))).toBe(false)
    expect(VOCABULARY_ACCESS.delete(as(staff('manager')))).toBe(true)
    expect(VOCABULARY_ACCESS.create(as({ collection: 'customers', roles: ['admin'] }))).toBe(false)
  })

  it('reads published records only for the public, drafts for staff', () => {
    expect(VOCABULARY_ACCESS.read(as(null))).toEqual({ _status: { equals: 'published' } })
    expect(VOCABULARY_ACCESS.read(as(staff('contributor')))).toBe(true)
    expect(VOCABULARY_ACCESS.readVersions(as(null))).toBe(false)
  })

  it('refuses a contributor’s publish, and nobody else’s', () => {
    expect(() => publish(staff('contributor'))).toThrow(/Contributors save drafts/)
    expect(publish(staff('contributor', 'cataloguer'))).toEqual({ _status: 'published' })
    expect(publish(staff('admin'))).toEqual({ _status: 'published' })
    expect(publish(null)).toEqual({ _status: 'published' })
    const draft = refuseContributorPublish({
      data: { _status: 'draft' },
      req: { user: staff('contributor') } as unknown as PayloadRequest,
    } as never)
    expect(draft).toEqual({ _status: 'draft' })
  })
})
