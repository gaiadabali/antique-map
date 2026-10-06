/**
 * TASKS.md 8.2.d–8.2.f on a real Postgres, over REST through Payload's own handler: the public
 * reads published works only; `physical` is invisible to the public and to store staff, who read
 * no work at all; the acquisition is the owner's alone; an editor writes and publishes; and,
 * outside a request with a collector on `req.context`, a refused save flushes nothing while a
 * committed one's tags are posted only once its operation has returned.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  server,
  startWorksStack,
  vocabulary,
  type Role,
  type WorksStack,
} from './works.test-support'

describe.skipIf(!server)('works: access and invalidation on a real database', () => {
  let stack: WorksStack
  let published: { id: number; workUid: string }
  let draft: { id: number }

  const complete = (ids: Awaited<ReturnType<typeof vocabulary>>, recto: number) => ({
    title: 'Bali by François Valentijn, c. 1726',
    objectType: 'map',
    date: { precision: 'circa', from: 1726 },
    makers: [{ maker: ids.maker, role: 'cartographer', certainty: 'certain' }],
    condition: { grade: ids.grade },
    images: [{ media: recto }],
  })
  const physical = {
    exportStatus: 'domestic-only',
    coaIssued: true,
    acquisition: {
      source: 'Estate sale',
      consignor: 'A. Consignor',
      cost: { amount: 1_500_000, currency: 'IDR' },
    },
  }
  let make: () => object

  beforeAll(async () => {
    stack = await startWorksStack('cms_works_access_test', (config, key) =>
      getPayload({ config, key }),
    )
    const ids = await vocabulary(stack.api)
    const recto = await stack.media('recto')
    make = () => complete(ids, recto)
    published = (await invalidationBatch().operation((context) =>
      stack.api.create({
        collection: 'works',
        data: { ...make(), physical, _status: 'published' },
        context,
      }),
    )) as unknown as { id: number; workUid: string }
    draft = await stack.api.create({
      collection: 'works',
      data: { title: 'Unpublished drawer find' },
    })
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const json = async (response: Response) => (await response.json()) as Record<string, unknown>
  const list = async (role?: Role) =>
    (await json(await stack.rest('GET', '/api/works?depth=0&limit=100', { role }))).docs as Array<
      Record<string, unknown>
    >

  it('reads published works to the public, drafts to the owner and editors, nothing to stores', async () => {
    expect((await list()).map((doc) => doc.id)).toEqual([published.id])
    expect((await stack.rest('GET', `/api/works/${draft.id}`)).status).toBe(404)
    expect((await list('editor')).map((doc) => doc.id).sort()).toEqual(
      [published.id, draft.id].sort(),
    )
    expect((await stack.rest('GET', '/api/works/versions')).status).toBe(403)
    expect((await stack.rest('GET', '/api/works?depth=0', { role: 'store' })).status).toBe(403)
    expect(
      (await stack.rest('GET', `/api/works/${published.id}?depth=0`, { role: 'store' })).status,
    ).toBe(403)
  })

  it('never shows physical to the public or the loaders', async () => {
    const [publicDoc] = await list()
    expect(publicDoc).not.toHaveProperty('physical')
    expect(publicDoc).not.toHaveProperty('cataloguing')
    expect(publicDoc).not.toHaveProperty('legacy')
    // The rights a reproduction rests on are staff's too (1.2.b).
    expect(publicDoc).not.toHaveProperty('rights')
    // The loaders' read: the Local API with access on and no user.
    const loader = await stack.api.findByID({
      collection: 'works',
      id: published.id,
      overrideAccess: false,
      depth: 0,
    })
    expect(loader).not.toHaveProperty('physical')
    expect(loader).not.toHaveProperty('rights')
    expect(loader.title).toBe('Bali by François Valentijn, c. 1726')
  })

  it('shows physical to an editor, and the acquisition to the owner alone', async () => {
    for (const role of ['editor'] as const) {
      const doc = await json(
        await stack.rest('GET', `/api/works/${published.id}?depth=0`, { role }),
      )
      expect(doc.physical, role).toMatchObject({ exportStatus: 'domestic-only', coaIssued: true })
      expect(doc.physical, role).not.toHaveProperty('acquisition')
    }
    const owner = await json(
      await stack.rest('GET', `/api/works/${published.id}?depth=0`, { role: 'owner' }),
    )
    expect(owner.physical).toMatchObject({
      acquisition: { consignor: 'A. Consignor', cost: { amount: 1_500_000, currency: 'IDR' } },
    })
  })

  it('lets an editor save a draft and publish it; store staff write nothing', async () => {
    const created = await stack.rest('POST', '/api/works?draft=true', {
      role: 'editor',
      json: { title: 'An editor’s draft', physical: { exportStatus: 'cleared' } },
    })
    expect(created.status).toBe(201)
    const { doc } = (await created.json()) as { doc: { id: number } }
    const stored = await stack.api.findByID({
      collection: 'works',
      id: doc.id,
      draft: true,
      depth: 0,
    })
    expect(stored.physical).toMatchObject({ exportStatus: 'cleared' })
    // Published on the Local API as the editor, access on: a publish over REST here has no
    // request scope for the cache's after-commit flush (`hooks/work-invalidate`).
    const { docs: editors } = await stack.api.find({
      collection: 'users',
      where: { role: { equals: 'editor' } },
      depth: 0,
    })
    const editor = { ...editors[0]!, collection: 'users' }
    const published = await invalidationBatch().operation((context) =>
      stack.api.update({
        collection: 'works',
        id: doc.id,
        data: { ...make(), _status: 'published' },
        overrideAccess: false,
        user: editor,
        context,
      }),
    )
    expect(published._status).toBe('published')
    expect(
      (await stack.rest('POST', '/api/works', { role: 'store', json: { title: 'x' } })).status,
    ).toBe(403)
    expect(
      (
        await stack.rest('PATCH', `/api/works/${doc.id}`, {
          role: 'store',
          json: { title: 'Renamed by a store' },
        })
      ).status,
    ).toBe(403)
  }, 60_000)

  describe('after the commit, outside a request: a collector on req.context (ARCHITECTURE.md §9)', () => {
    const posts: string[][] = []
    const batch = () =>
      invalidationBatch({
        target: { origin: 'http://127.0.0.1:9', secret: 'test-only' },
        fetch: (async (_url: unknown, init?: RequestInit) => {
          posts.push((JSON.parse(String(init?.body)) as { tags: string[] }).tags)
          return new Response(null, { status: 204 })
        }) as typeof fetch,
      })

    it('a save that rolls back flushes nothing', async () => {
      const refused = batch()
      const outcome = await refused
        .operation((context) =>
          stack.api.create({
            collection: 'works',
            data: { title: '', _status: 'published' },
            context,
          }),
        )
        .then(
          () => 'saved',
          (error: Error) => error.name,
        )
      expect(outcome).toBe('ValidationError')
      expect(refused.pending).toEqual([])
      expect(await refused.flush()).toBe(0)
      expect(posts).toEqual([])
      const titled = await stack.api.find({
        collection: 'works',
        where: { title: { equals: '' } },
        draft: true,
      })
      expect(titled.docs).toEqual([])
    })

    it('a committed save’s tags are flushed only once its operation has returned', async () => {
      const committed = batch()
      const doc = await committed.operation(async (context) => {
        const saved = await stack.api.update({
          collection: 'works',
          id: published.id,
          data: { title: 'Bali by François Valentijn, 1726' },
          context,
        })
        // Inside the operation: nothing kept, so a flush posts nothing.
        expect(committed.pending).toEqual([])
        expect(await committed.flush()).toBe(0)
        return saved
      })
      expect(posts).toEqual([])
      // The work's own tag and the gallery's listings (`hooks/work-invalidate`).
      const tags = [`work:${published.workUid}`, 'catalogue:gallery']
      expect(committed.pending).toEqual(tags)
      const visible = await stack.pool.query(
        `SELECT work_uid FROM works WHERE id = ${Number(doc.id)}`,
      )
      expect(visible.rows).toEqual([{ work_uid: published.workUid }])
      expect(await committed.flush()).toBe(2)
      expect(posts).toEqual([tags])
    })
  })
})
