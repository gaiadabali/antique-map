/**
 * Slugs (TASKS.md 8.1): derived once in C10's segment shape, unique as stored and as held by a
 * latest draft. The saves themselves are proved on a database (`collections/places/*.db.test`).
 */
import { describe, expect, it } from 'vitest'

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
  const req = { payload: { collections: {}, count: async () => ({ totalDocs: 0 }) } }
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

describe('an address held by a draft (senior-be review of 8.1, N1)', () => {
  type Hook = (args: Record<string, unknown>) => Promise<unknown>
  const derive = slugField({ from: 'name' }).hooks!.beforeValidate![0] as unknown as Hook
  const asked: unknown[] = []
  const req = {
    payload: {
      collections: { makers: { config: { versions: { drafts: { validate: true } } } } },
      count: async () => ({ totalDocs: 0 }),
      countVersions: async ({ where }: { where: { and: Array<Record<string, unknown>> } }) => {
        asked.push(where)
        const held = where.and.some(
          (clause) =>
            JSON.stringify(clause) === JSON.stringify({ 'version.slug': { equals: 'gamma' } }),
        )
        return { totalDocs: held ? 1 : 0 }
      },
    },
  }

  it('is not handed to another record: a latest draft holding it counts as taken', async () => {
    const made = await derive({
      collection: { slug: 'makers' },
      req,
      siblingData: { name: 'Gamma' },
    })
    expect(made).toBe('gamma-2')
    expect(JSON.stringify(asked[0])).toContain('"latest":{"equals":true}')
  })

  it('does not count the record’s own drafts against it', async () => {
    asked.length = 0
    const originalDoc = { id: 7 }
    await derive({
      collection: { slug: 'makers' },
      req,
      originalDoc,
      siblingData: { name: 'Delta' },
    })
    expect(JSON.stringify(asked[0])).toContain('"parent":{"not_equals":7}')
  })
})
