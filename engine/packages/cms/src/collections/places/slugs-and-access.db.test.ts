/**
 * Two of the senior-be review's points on a real Postgres (8.1, N1 and N3):
 * - N1: an address a record holds only in its latest draft is never handed to another record,
 *   so that draft can still publish;
 * - N3: `translationStatus` is staff-only — absent from what the public reads.
 * Its own database, schema pushed (`./pushed-database.test-support`); skips without
 * `CMS_TEST_POSTGRES_URL` (CONVENTIONS.md §8).
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { collectingWrites, createPushedDatabase, type Pool } from './pushed-database.test-support'

const server = process.env.CMS_TEST_POSTGRES_URL

describe.skipIf(!server)('slugs held by drafts, and the staff-only translation status', () => {
  const db = {} as { payload: Payload; pool: Pool }
  let drop: () => Promise<void> = async () => {}
  const GAMMA = 'gamma'

  beforeAll(async () => {
    const pushed = await createPushedDatabase(server!, 'cms_slugs_access_test')
    drop = pushed.drop
    // Outside a request: the cache hooks' tags go to a collector (`collectingWrites`).
    db.payload = collectingWrites(await getPayload({ config: pushed.config, key: pushed.database }))
    db.pool = (db.payload.db as unknown as { pool: Pool }).pool
  }, 180_000)

  afterAll(async () => {
    if (!db.payload) return
    db.pool.on?.('error', () => {})
    await db.payload.destroy()
    await drop()
  }, 60_000)

  it('N1: keeps a draft’s hand-typed address for that record', async () => {
    const a = await db.payload.create({
      collection: 'makers',
      data: { name: 'Alpha', sortName: 'ALPHA', _status: 'published' },
    })
    await db.payload.update({
      collection: 'makers',
      id: a.id,
      draft: true,
      data: { slug: GAMMA },
    })
    const b = await db.payload.create({
      collection: 'makers',
      data: { name: 'Gamma', sortName: 'GAMMA' },
    })
    expect(b.slug).toBe('gamma-2')
    const published = await db.payload.update({
      collection: 'makers',
      id: a.id,
      data: { _status: 'published' },
    })
    expect(published.slug).toBe(GAMMA)
  })

  it('N3: hides translationStatus from the public, shows it to staff', async () => {
    await db.payload.create({
      collection: 'places',
      data: { name: 'Java', translationStatus: 'reviewed', _status: 'published' },
    })
    const anyone = await db.payload.find({ collection: 'places', overrideAccess: false, depth: 0 })
    expect(anyone.docs).toHaveLength(1)
    expect(anyone.docs[0]).not.toHaveProperty('translationStatus')
    const owner = await db.payload.create({
      collection: 'users',
      data: { email: 'owner@test.example', password: 'correct horse 42', name: 'Owner' },
    })
    const staff = await db.payload.find({
      collection: 'places',
      overrideAccess: false,
      user: { ...owner, collection: 'users' },
      depth: 0,
    })
    expect(staff.docs[0]).toHaveProperty('translationStatus', 'reviewed')
  })
})
