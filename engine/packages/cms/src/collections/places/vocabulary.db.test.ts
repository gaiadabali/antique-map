/**
 * TASKS.md 8.1.e on a real Postgres: makers, places, terms and sources save with validation,
 * localisation and slugs; a place stores historical names and a parent; re-parenting a place
 * under its own descendant is refused — published or draft; the public reads published records
 * only; an editor publishes and store staff read none of it.
 *
 * It makes its own database on the server `CMS_TEST_POSTGRES_URL` names and **pushes** the
 * schema (`./pushed-database.test-support`) — these collections reach a migration only after the wave
 * merges (TASKS.md 10.3.a) — then drops it. Without that variable it skips:
 * a setup state; a server that is named and refuses is a failure (CONVENTIONS.md §8).
 */
import { APIError, getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  collectingWrites,
  createPushedDatabase,
  refusedWith,
  type Pool,
} from './pushed-database.test-support'

const server = process.env.CMS_TEST_POSTGRES_URL

describe.skipIf(!server)('the discovery vocabulary on a real database', () => {
  const db = {} as { payload: Payload; pool: Pool }
  let drop: () => Promise<void> = async () => {}

  beforeAll(async () => {
    const pushed = await createPushedDatabase(server!, 'cms_vocabulary_test')
    drop = pushed.drop
    // Outside a request: the cache hooks' tags go to a collector (`collectingWrites`).
    db.payload = collectingWrites(await getPayload({ config: pushed.config, key: pushed.database }))
    db.pool = (db.payload.db as unknown as { pool: Pool }).pool
  }, 180_000)

  afterAll(async () => {
    if (!db.payload) return
    // Dropping the database ends whatever connection the pool is still closing: expected.
    db.pool.on?.('error', () => {})
    await db.payload.destroy()
    await drop()
  }, 60_000)
  const BATAVIA = 'batavia'

  it('stores a place with its historical names, its parent and a name per locale', async () => {
    const java = await db.payload.create({
      collection: 'places',
      data: {
        name: 'Java',
        type: 'island',
        historicalNames: [{ name: 'Iava', language: 'la' }],
        _status: 'published',
      },
    })
    await db.payload.update({
      collection: 'places',
      id: java.id,
      locale: 'id',
      data: { name: 'Jawa' },
    })
    const jakarta = await db.payload.create({
      collection: 'places',
      data: {
        name: 'Jakarta',
        slug: BATAVIA,
        parent: java.id,
        historicalNames: [
          { name: 'Batavia', language: 'nl', period: '1619–1942' },
          { name: 'Jayakarta', language: 'jv' },
        ],
        geo: { lat: -6.13, lng: 106.81 },
        _status: 'published',
      },
    })
    const stored = await db.payload.findByID({ collection: 'places', id: jakarta.id, depth: 0 })
    expect(stored.slug).toBe(BATAVIA)
    expect(stored.parent).toBe(java.id)
    expect(stored).toMatchObject({
      historicalNames: [
        { name: 'Batavia', language: 'nl', period: '1619–1942' },
        { name: 'Jayakarta', language: 'jv', period: null },
      ],
    })
    const both = await db.payload.findByID({ collection: 'places', id: java.id, locale: 'all' })
    expect(both.name).toEqual({ en: 'Java', id: 'Jawa' })
    expect(both.slug).toBe('java')
  })

  it('a place cannot be its own ancestor — directly or two levels down — published or as a draft', async () => {
    const { docs } = await db.payload.find({
      collection: 'places',
      where: { slug: { equals: 'java' } },
    })
    const java = docs[0]!
    const kota = await db.payload.create({
      collection: 'places',
      data: { name: 'Kota Tua', parent: (await idOfSlug(BATAVIA))! },
    })
    for (const draft of [false, true]) {
      const errors = await refusedWith(() =>
        db.payload.update({ collection: 'places', id: java.id, draft, data: { parent: kota.id } }),
      )
      expect(errors.parent).toBe(
        'This place cannot go under Kota Tua: that place is already inside this one (Kota Tua › Jakarta › Java). Move it out first.',
      )
    }
    expect(
      (
        await refusedWith(() =>
          db.payload.update({ collection: 'places', id: java.id, data: { parent: java.id } }),
        )
      ).parent,
    ).toBe('A place cannot be its own parent.')
    const after = await db.payload.findByID({
      collection: 'places',
      id: java.id,
      draft: true,
      depth: 0,
    })
    expect(after.parent ?? null).toBeNull()
    await expect(db.payload.delete({ collection: 'places', id: java.id })).rejects.toBeInstanceOf(
      APIError,
    )
  })

  async function idOfSlug(slug: string): Promise<number | string | undefined> {
    const { docs } = await db.payload.find({
      collection: 'places',
      where: { slug: { equals: slug } },
    })
    return docs[0]?.id
  }

  it('saves a maker in two locales and keeps its slug when renamed', async () => {
    const maker = await db.payload.create({
      collection: 'makers',
      data: {
        name: 'François Valentijn',
        sortName: 'VALENTIJN, François',
        aliases: [{ name: 'Valentyn' }],
        roles: ['author', 'cartographer'],
        born: { precision: 'exact', from: 1666 },
        died: { precision: 'exact', from: 1727 },
        nationality: 'Dutch',
      },
    })
    expect(maker.slug).toBe('francois-valentijn')
    await db.payload.update({
      collection: 'makers',
      id: maker.id,
      locale: 'id',
      data: { nationality: 'Belanda' },
    })
    await db.payload.update({
      collection: 'makers',
      id: maker.id,
      data: { name: 'François Valentyn' },
    })
    const both = await db.payload.findByID({ collection: 'makers', id: maker.id, locale: 'all' })
    expect(both.nationality).toEqual({ en: 'Dutch', id: 'Belanda' })
    expect(both.slug).toBe('francois-valentijn')
    const twin = await db.payload.create({
      collection: 'makers',
      data: { name: 'François Valentijn', sortName: 'VALENTIJN, François' },
    })
    expect(twin.slug).toBe('francois-valentijn-2')
  })

  it('refuses a maker whose dates are uncertain without saying so, or out of order', async () => {
    const errors = await refusedWith(() =>
      db.payload.create({
        collection: 'makers',
        draft: true,
        data: {
          name: 'Joan Blaeu',
          sortName: 'BLAEU, Joan',
          born: { precision: 'unknown', from: 1596 },
          died: { precision: 'range', from: 1673, to: 1670 },
          aliases: [{ name: 'joan blaeu' }],
          sameAs: [{ url: 'javascript:alert(1)' }],
        },
      }),
    )
    expect(Object.keys(errors).sort()).toEqual([
      'aliases.0.name',
      'born.precision',
      'died.to',
      'sameAs.0.url',
    ])
  })

  it('saves terms per vocabulary, and holds a grade to its definition when published', async () => {
    const mood = await db.payload.create({
      collection: 'terms',
      data: { kind: 'mood', label: 'Warm' },
    })
    const room = await db.payload.create({
      collection: 'terms',
      data: { kind: 'room', label: 'Warm' },
    })
    expect([mood.slug, room.slug]).toEqual(['warm', 'warm'])
    const draft = await db.payload.create({
      collection: 'terms',
      draft: true,
      data: { kind: 'grade', label: 'VG+' },
    })
    expect(draft.slug).toBe('vg-plus')
    const errors = await refusedWith(() =>
      db.payload.update({ collection: 'terms', id: draft.id, data: { _status: 'published' } }),
    )
    expect(Object.keys(errors).sort()).toEqual(['definition', 'equivalent'])
    await db.payload.update({
      collection: 'terms',
      id: draft.id,
      data: { definition: 'Very good plus.', equivalent: 'A', _status: 'published' },
    })
    await db.payload.update({
      collection: 'terms',
      id: draft.id,
      locale: 'id',
      data: { definition: 'Sangat baik plus.', translationStatus: 'machine' },
    })
    const both = await db.payload.findByID({ collection: 'terms', id: draft.id, locale: 'all' })
    expect(both.definition).toEqual({ en: 'Very good plus.', id: 'Sangat baik plus.' })
    expect(both.translationStatus).toEqual({ en: 'entered', id: 'machine' })
    expect(
      (
        await refusedWith(() =>
          db.payload.update({ collection: 'terms', id: mood.id, data: { kind: 'room' } }),
        )
      ).kind,
    ).toMatch(/keeps its vocabulary/)
  })

  it('shows the public published records only; an editor publishes, store staff touch nothing', async () => {
    const pub = await db.payload.find({ collection: 'places', overrideAccess: false, depth: 0 })
    expect(pub.docs.map((doc) => doc.name).sort()).toEqual(['Jakarta', 'Java'])
    await db.payload.create({
      collection: 'users',
      data: { email: 'owner@test.example', password: 'correct horse 42', name: 'Owner' },
    })
    const shop = await db.payload.create({ collection: 'stores', data: { code: 'K-1', name: 'K' } })
    const asUser = async (role: 'editor' | 'store') => {
      const store = role === 'store' ? { store: shop.id } : {}
      const data = { email: `${role}@test.example`, password: 'correct horse 42', name: role, role }
      const user = await db.payload.create({ collection: 'users', data: { ...data, ...store } })
      return { ...user, collection: 'users' as const }
    }
    const [editor, store] = [await asUser('editor'), await asUser('store')]
    const as = (user: typeof editor) => ({ overrideAccess: false, user })
    const draft = await db.payload.create({
      collection: 'makers',
      ...as(editor),
      draft: true,
      data: { name: 'Parry', sortName: 'PARRY' },
    })
    const published = await db.payload.update({
      collection: 'makers',
      id: draft.id,
      ...as(editor),
      data: { _status: 'published' },
    })
    expect(published._status).toBe('published')
    await expect(
      db.payload.create({
        collection: 'makers',
        ...as(store),
        data: { name: 'Tooley', sortName: 'TOOLEY' },
      }),
    ).rejects.toThrow()
    // Store staff read no catalogue record (CONTENT-MODEL.md §7): refused, not merely empty.
    await expect(
      db.payload.find({ collection: 'places', ...as(store), depth: 0 }),
    ).rejects.toThrow()
    // The `sources` collection is gone (TASKS.md 3.2.a): its tables never existed here.
    const tables = await db.pool.query(
      `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_name IN ('makers', 'places', 'terms', 'sources', '_places_v')`,
    )
    expect(tables.rows[0]!.n).toBe(4)
  })
})
