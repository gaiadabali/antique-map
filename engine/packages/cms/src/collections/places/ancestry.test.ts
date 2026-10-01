/**
 * The hook that applies the cycle guard (TASKS.md 8.1.b): it walks the chain above a proposed
 * parent in both versions of the tree — published and latest draft — and refuses the save with a
 * field error on `parent`. A fake Local API stands in for the database here; the real one is
 * `vocabulary.db.test.ts`.
 */
import { ValidationError, type PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { guardAncestry, idOf, keepChildrenAttached } from './ancestry'

type Row = { name: string; parent: number | null }
type Tree = Record<number, Row>

/** A Local API that answers `findByID` from one tree for published reads, another for drafts. */
function fakeReq(published: Tree, latest: Tree = published, children = 0): PayloadRequest {
  return {
    payload: {
      findByID: async ({ id, draft }: { id: number; draft?: boolean }) => {
        const row = (draft ? latest : published)[Number(id)]
        return row ? { id: Number(id), ...row } : null
      },
      count: async () => ({ totalDocs: children }),
    },
  } as unknown as PayloadRequest
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
  guardAncestry({
    data,
    originalDoc,
    operation: originalDoc ? 'update' : 'create',
    req,
  } as never)

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
    const req = fakeReq(TREE)
    await expect(save(req, { name: 'Banten', parent: 1 })).resolves.toEqual({
      name: 'Banten',
      parent: 1,
    })
    await expect(save(req, { parent: 4 }, { id: 2, parent: 1 })).resolves.toEqual({ parent: 4 })
  })

  it('refuses re-parenting a place under its own grandchild, naming the loop', async () => {
    const message = await refusal(() =>
      save(fakeReq(TREE), { name: 'Java', parent: 3 }, { id: 1, parent: null }),
    )
    expect(message).toBe(
      'This place cannot go under Kota Tua: that place is already inside this one (Kota Tua › Batavia › Java). Move it out first.',
    )
  })

  it('refuses a place as its own parent, given as a populated document too', async () => {
    const message = await refusal(() =>
      save(fakeReq(TREE), { parent: { id: 1, name: 'Java' } }, { id: 1, parent: null }),
    )
    expect(message).toBe('A place cannot be its own parent.')
  })

  it('judges the parent already stored when the save does not send one (a publish)', async () => {
    // The latest draft of Java already names Kota Tua; publishing it sends only `_status`.
    const message = await refusal(() =>
      save(fakeReq(TREE), { _status: 'published' }, { id: 1, parent: 3 }),
    )
    expect(message).toMatch(/cannot go under Kota Tua/)
  })

  it('refuses a loop that only the drafts would close', async () => {
    // Published: Lombok is a root. Latest draft: Lombok under Bali. Moving Bali under Lombok
    // would loop as soon as both drafts are published.
    const latest: Tree = { ...TREE, 5: { name: 'Lombok', parent: 4 } }
    const message = await refusal(() =>
      save(fakeReq(TREE, latest), { parent: 5 }, { id: 4, parent: null }),
    )
    expect(message).toMatch(/cannot go under Lombok/)
  })

  it('refuses a loop that only the published tree would close', async () => {
    // Published: Lombok under Bali. Latest draft: Lombok moved back to the top, not yet published.
    const published: Tree = { ...TREE, 5: { name: 'Lombok', parent: 4 } }
    const message = await refusal(() =>
      save(fakeReq(published, TREE), { parent: 5 }, { id: 4, parent: null }),
    )
    expect(message).toMatch(/cannot go under Lombok/)
  })

  it('refuses a parent that does not exist', async () => {
    const message = await refusal(() => save(fakeReq(TREE), { name: 'Banten', parent: 99 }))
    expect(message).toMatch(/does not exist/)
  })
})

describe('deleting a place', () => {
  it('is refused while places lie in it, and allowed once none do', async () => {
    const remove = (children: number) =>
      keepChildrenAttached({ id: 1, req: fakeReq(TREE, TREE, children) } as never)
    await expect(remove(2)).rejects.toThrow(/while 2 places are under it/)
    await expect(remove(0)).resolves.toBeUndefined()
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
