/**
 * The hooks that apply the place-tree guards (TASKS.md 8.1.b; senior-be review of 8.1, S1–S3):
 * under the tree lock, they walk the chain above a proposed parent in both versions of the tree —
 * published and latest draft — judge depth only on a move and for the whole subtree it carries,
 * and refuse a delete while a child points at the place in either version. A fake Local API
 * stands in for the database here; the real one is `places-tree.db.test.ts`.
 */
import { ValidationError, type PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { guardAncestry, idOf, keepChildrenAttached } from './ancestry'

type Row = { name: string; parent: number | null }
type Tree = Record<number, Row>
type Where = { parent?: { in: number[] }; and?: Array<Record<string, { in?: number[] }>> }

/** A Local API answering from one tree for published reads and another for latest drafts. */
function fakeReq(published: Tree, latest: Tree = published, options = { transaction: true }) {
  const locks: string[] = []
  const under = (tree: Tree, ids: number[]) =>
    Object.entries(tree)
      .filter(([, row]) => row.parent !== null && ids.map(Number).includes(row.parent))
      .map(([id]) => Number(id))
  const req = {
    transactionID: options.transaction ? 'tx-1' : undefined,
    payload: {
      db: {
        sessions: { 'tx-1': { db: {} } },
        execute: async ({ raw }: { raw: string }) => void locks.push(raw),
      },
      findByID: async ({ id, draft }: { id: number; draft?: boolean }) => {
        const row = (draft ? latest : published)[Number(id)]
        return row ? { id: Number(id), ...row } : null
      },
      find: async ({ where }: { where: Where }) => ({
        docs: under(published, where.parent!.in).map((id) => ({ id })),
      }),
      findVersions: async ({ where }: { where: Where }) => ({
        docs: under(latest, where.and![1]!['version.parent']!.in!).map((id) => ({ parent: id })),
      }),
    },
  } as unknown as PayloadRequest
  return { req, locks }
}

/** Java (1) › Batavia (2) › Kota Tua (3); Bali (4) and Lombok (5) at the top. */
const TREE: Tree = {
  1: { name: 'Java', parent: null },
  2: { name: 'Batavia', parent: 1 },
  3: { name: 'Kota Tua', parent: 2 },
  4: { name: 'Bali', parent: null },
  5: { name: 'Lombok', parent: null },
}

const save = (
  req: PayloadRequest,
  data: Record<string, unknown>,
  originalDoc?: Record<string, unknown>,
) =>
  guardAncestry({ data, originalDoc, operation: originalDoc ? 'update' : 'create', req } as never)

async function refusal(run: () => unknown): Promise<string> {
  try {
    await run()
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError)
    const [first] = (error as ValidationError).data.errors
    expect(first?.path).toBe('parent')
    return first!.message
  }
  throw new Error('the save went through')
}

describe('the ancestry hook', () => {
  it('lets a new place go under any place, and a moved one under a place outside it', async () => {
    const { req, locks } = fakeReq(TREE)
    await expect(save(req, { name: 'Banten', parent: 1 })).resolves.toEqual({
      name: 'Banten',
      parent: 1,
    })
    await expect(save(req, { parent: 4 }, { id: 2, parent: 1 })).resolves.toEqual({ parent: 4 })
    // Each save took the tree lock before it walked (S1).
    expect(locks).toHaveLength(2)
    expect(locks[0]).toMatch(/^SELECT pg_advisory_xact_lock\(-?\d+\)$/)
  })

  it('refuses a tree write it cannot lock: no transaction, no guarded save', async () => {
    const { req } = fakeReq(TREE, TREE, { transaction: false })
    await expect(save(req, { name: 'Banten', parent: 1 })).rejects.toThrow(/needs a transaction/)
  })

  it('refuses re-parenting a place under its own grandchild, naming the loop', async () => {
    const { req } = fakeReq(TREE)
    expect(
      await refusal(() => save(req, { name: 'Java', parent: 3 }, { id: 1, parent: null })),
    ).toBe(
      'This place cannot go under Kota Tua: that place is already inside this one (Kota Tua › Batavia › Java). Move it out first.',
    )
  })

  it('refuses a place as its own parent, given as a populated document too', async () => {
    const { req } = fakeReq(TREE)
    const message = await refusal(() =>
      save(req, { parent: { id: 1, name: 'Java' } }, { id: 1, parent: null }),
    )
    expect(message).toBe('A place cannot be its own parent.')
  })

  it('judges the parent already stored when the save does not send one (a publish)', async () => {
    const { req } = fakeReq(TREE)
    const message = await refusal(() => save(req, { _status: 'published' }, { id: 1, parent: 3 }))
    expect(message).toMatch(/cannot go under Kota Tua/)
  })

  it('refuses a loop that only the drafts, or only the published tree, would close', async () => {
    const lombokUnderBali: Tree = { ...TREE, 5: { name: 'Lombok', parent: 4 } }
    for (const [published, latest] of [
      [TREE, lombokUnderBali],
      [lombokUnderBali, TREE],
    ] as const) {
      const { req } = fakeReq(published, latest)
      const message = await refusal(() => save(req, { parent: 5 }, { id: 4, parent: null }))
      expect(message).toMatch(/cannot go under Lombok/)
    }
  })

  it('refuses a parent that does not exist', async () => {
    const { req } = fakeReq(TREE)
    expect(await refusal(() => save(req, { name: 'Banten', parent: 99 }))).toMatch(/does not exist/)
  })
})

describe('depth, judged on a move and for the subtree it carries (S2)', () => {
  // L1 › L2 › L3 › L4 › L5 (ids 11–15); F (20) › G (21) apart.
  const CHAIN: Tree = {
    11: { name: 'L1', parent: null },
    12: { name: 'L2', parent: 11 },
    13: { name: 'L3', parent: 12 },
    14: { name: 'L4', parent: 13 },
    15: { name: 'L5', parent: 14 },
    20: { name: 'F', parent: null },
    21: { name: 'G', parent: 20 },
  }

  it('refuses moving F, with G under it, below L5: G would reach level 7', async () => {
    const { req } = fakeReq(CHAIN)
    expect(await refusal(() => save(req, { parent: 15 }, { id: 20, parent: null }))).toBe(
      'The place hierarchy goes at most 6 levels deep; under this parent the place, with the 1 level(s) of places under it, would reach level 7.',
    )
  })

  it('counts a child that only a draft puts under the moved place', async () => {
    const draftOnly: Tree = { ...CHAIN, 21: { name: 'G', parent: null } }
    const latest: Tree = { ...CHAIN }
    const { req } = fakeReq(draftOnly, latest)
    expect(await refusal(() => save(req, { parent: 15 }, { id: 20, parent: null }))).toMatch(
      /level 7/,
    )
  })

  it('lets F and G move below L4, and a leaf below L5', async () => {
    const { req } = fakeReq(CHAIN)
    await expect(save(req, { parent: 14 }, { id: 20, parent: null })).resolves.toEqual({
      parent: 14,
    })
    await expect(save(req, { parent: 15 }, { id: 21, parent: 20 })).resolves.toEqual({
      parent: 15,
    })
  })

  it('never refuses a save that keeps its parent, however deep it already sits', async () => {
    // G stored at level 7 (written before this guard): editing it must still work.
    const deep: Tree = { ...CHAIN, 20: { name: 'F', parent: 15 } }
    const { req } = fakeReq(deep)
    await expect(save(req, { type: 'town' }, { id: 21, parent: 20 })).resolves.toEqual({
      type: 'town',
    })
    // …while a cycle is still refused on such a save.
    expect(await refusal(() => save(req, { parent: 21 }, { id: 11, parent: null }))).toMatch(
      /cannot go under G/,
    )
  })
})

describe('deleting a place (S3)', () => {
  const remove = (published: Tree, latest: Tree) =>
    keepChildrenAttached({ id: 1, req: fakeReq(published, latest).req } as never)

  it('is refused while a place lies in it, as stored or only in a draft', async () => {
    await expect(remove(TREE, TREE)).rejects.toThrow(/while one place is under it/)
    const rootsOnly: Tree = { 1: TREE[1]!, 4: TREE[4]!, 5: { name: 'Lombok', parent: null } }
    const draftUnderJava: Tree = { ...rootsOnly, 5: { name: 'Lombok', parent: 1 } }
    await expect(remove(rootsOnly, draftUnderJava)).rejects.toThrow(/published or in a draft/)
  })

  it('is allowed once no version of any place points at it', async () => {
    const rootsOnly: Tree = { 1: TREE[1]!, 4: TREE[4]! }
    await expect(remove(rootsOnly, rootsOnly)).resolves.toBeUndefined()
  })
})

describe('idOf', () => {
  it('reads an id, a populated document or nothing', () => {
    expect(idOf(3)).toBe(3)
    expect(idOf('3')).toBe('3')
    expect(idOf({ id: 3 })).toBe(3)
    expect(idOf(null)).toBeNull()
    expect(idOf(undefined)).toBeNull()
    expect(idOf('')).toBeNull()
  })
})
