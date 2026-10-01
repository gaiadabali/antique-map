/**
 * The place tree's integrity on a real Postgres (senior-be review of 8.1, S1–S3):
 * - S1: two concurrent re-parents that would swap two places (X under Y, Y under X) never both
 *   commit — the place-tree lock serialises them, and no cycle is ever stored;
 * - S2: a move fits the subtree it carries in `MAX_PLACE_DEPTH`; a save that keeps its parent is
 *   never refused for depth;
 * - S3: a place cannot be deleted while a child points at it, as stored or only in a draft.
 * Its own database, schema pushed (`./pushed-database.test-support`); skips without
 * `CMS_TEST_POSTGRES_URL` (CONVENTIONS.md §8).
 */
import { APIError, getPayload, ValidationError, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createPushedDatabase, refusedWith, type Pool } from './pushed-database.test-support'

const server = process.env.CMS_TEST_POSTGRES_URL

describe.skipIf(!server)('the place tree on a real database', () => {
  const db = {} as { payload: Payload; pool: Pool }
  let drop: () => Promise<void> = async () => {}

  beforeAll(async () => {
    const pushed = await createPushedDatabase(server!, 'cms_places_tree_test')
    drop = pushed.drop
    db.payload = await getPayload({ config: pushed.config, key: pushed.database })
    db.pool = (db.payload.db as unknown as { pool: Pool }).pool
  }, 180_000)

  afterAll(async () => {
    if (!db.payload) return
    db.pool.on?.('error', () => {})
    await db.payload.destroy()
    await drop()
  }, 60_000)

  const place = async (name: string, parent: number | null = null, published = true) =>
    (
      await db.payload.create({
        collection: 'places',
        data: { name, parent, ...(published ? { _status: 'published' } : {}) },
      })
    ).id as number
  const parentsOf = async (...ids: number[]) => {
    const { rows } = await db.pool.query(
      `SELECT id, parent_id FROM places WHERE id IN (${ids.join(',')}) ORDER BY id`,
    )
    return rows.map((row) => row.parent_id ?? null)
  }

  it('S1: lets exactly one of two concurrent swaps through, and stores no cycle', async () => {
    for (let round = 0; round < 8; round += 1) {
      const draft = round % 2 === 1
      const x = await place(`X${round}`)
      const y = await place(`Y${round}`)
      const results = await Promise.allSettled([
        db.payload.update({ collection: 'places', id: x, draft, data: { parent: y } }),
        db.payload.update({ collection: 'places', id: y, draft, data: { parent: x } }),
      ])
      const refused = results.filter((r) => r.status === 'rejected')
      expect(
        results.filter((r) => r.status === 'fulfilled'),
        `round ${round}`,
      ).toHaveLength(1)
      expect(refused).toHaveLength(1)
      const reason = (refused[0] as PromiseRejectedResult).reason
      expect(reason).toBeInstanceOf(ValidationError)
      expect((reason as ValidationError).data.errors[0]?.message).toMatch(/is already inside/)
      // Neither the stored nor the latest-draft tree holds both edges.
      const stored = await parentsOf(x, y)
      expect(stored[0] === y && stored[1] === x).toBe(false)
      const latest = await db.pool.query(
        `SELECT parent_id, version_parent_id FROM _places_v WHERE latest AND parent_id IN (${x},${y}) ORDER BY parent_id`,
      )
      const [px, py] = latest.rows.map((row) => row.version_parent_id ?? null)
      expect(px === y && py === x).toBe(false)
    }
  }, 120_000)

  it('S1: refuses a tree write with no transaction to hold the lock', async () => {
    const lone = await place('Lone')
    const root = await place('Root')
    await expect(
      db.payload.update({
        collection: 'places',
        id: lone,
        data: { parent: root },
        disableTransaction: true,
      }),
    ).rejects.toThrow(/needs a transaction/)
    expect(await parentsOf(lone)).toEqual([null])
  })

  it('S2: refuses a move whose subtree would pass six levels; never a save that stays put', async () => {
    let parent: number | null = null
    const chain: number[] = []
    for (const name of ['L1', 'L2', 'L3', 'L4', 'L5'])
      chain.push((parent = await place(name, parent)))
    const f = await place('F')
    const g = await place('G', f)
    expect(
      (
        await refusedWith(() =>
          db.payload.update({ collection: 'places', id: f, data: { parent: chain[4] } }),
        )
      ).parent,
    ).toBe(
      'The place hierarchy goes at most 6 levels deep; under this parent the place, with the 1 level(s) of places under it, would reach level 7.',
    )
    await db.payload.update({ collection: 'places', id: f, data: { parent: chain[3] } })
    // G now sits at level 6; editing it, without moving it, is never refused.
    await db.payload.update({ collection: 'places', id: g, data: { type: 'town' } })
    expect(await parentsOf(f, g)).toEqual([chain[3], f])
  })

  it('S3: refuses deleting a place a child points at only in its latest draft', async () => {
    const p = await place('P')
    const c = await place('C')
    await db.payload.update({ collection: 'places', id: c, draft: true, data: { parent: p } })
    expect(await parentsOf(c)).toEqual([null]) // stored: still a root
    const refusal = db.payload.delete({ collection: 'places', id: p })
    await expect(refusal).rejects.toBeInstanceOf(APIError)
    await expect(db.payload.delete({ collection: 'places', id: p })).rejects.toThrow(
      /one place is under it \(published or in a draft\)/,
    )
    await db.payload.update({ collection: 'places', id: c, draft: true, data: { parent: null } })
    await expect(db.payload.delete({ collection: 'places', id: p })).resolves.toBeTruthy()
  })
})
