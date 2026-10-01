/**
 * TASKS.md 8.2.d–8.2.f on a real Postgres, over REST through Payload's own handler: the public
 * reads published works only; `physical` is invisible to the public and to every role without
 * access; a contributor saves drafts only; a copy's synced fields reject a person's edit; and,
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

  it('reads published works to the public, and drafts to staff (publishedOrStaff)', async () => {
    expect((await list()).map((doc) => doc.id)).toEqual([published.id])
    expect((await stack.rest('GET', `/api/works/${draft.id}`)).status).toBe(404)
    expect((await list('contributor')).map((doc) => doc.id).sort()).toEqual(
      [published.id, draft.id].sort(),
    )
    expect((await stack.rest('GET', '/api/works/versions')).status).toBe(403)
  })

  it('never shows physical to the public, nor to an editor, an analyst or a contributor', async () => {
    const [publicDoc] = await list()
    expect(publicDoc).not.toHaveProperty('physical')
    expect(publicDoc).not.toHaveProperty('cataloguing')
    expect(publicDoc).not.toHaveProperty('legacy')
    for (const role of ['editor', 'analyst', 'contributor'] as const) {
      const doc = await json(
        await stack.rest('GET', `/api/works/${published.id}?depth=0`, { role }),
      )
      expect(doc.id, role).toBe(published.id)
      expect(doc, role).not.toHaveProperty('physical')
    }
    // The loaders' read: the Local API with access on and no user.
    const loader = await stack.api.findByID({
      collection: 'works',
      id: published.id,
      overrideAccess: false,
      depth: 0,
    })
    expect(loader).not.toHaveProperty('physical')
    expect(loader.title).toBe('Bali by François Valentijn, c. 1726')
  })

  it('shows physical to a cataloguer and fulfilment, and the acquisition to an admin alone', async () => {
    for (const role of ['cataloguer', 'fulfilment'] as const) {
      const doc = await json(
        await stack.rest('GET', `/api/works/${published.id}?depth=0`, { role }),
      )
      expect(doc.physical, role).toMatchObject({ exportStatus: 'domestic-only', coaIssued: true })
      expect(doc.physical, role).not.toHaveProperty('acquisition')
    }
    const admin = await json(
      await stack.rest('GET', `/api/works/${published.id}?depth=0`, { role: 'admin' }),
    )
    expect(admin.physical).toMatchObject({
      acquisition: { consignor: 'A. Consignor', cost: { amount: 1_500_000, currency: 'IDR' } },
    })
  })

  it('lets a contributor save a draft — without physical — and never publish', async () => {
    const created = await stack.rest('POST', '/api/works?draft=true', {
      role: 'contributor',
      json: { title: 'A contributor’s draft', physical: { exportStatus: 'cleared' } },
    })
    expect(created.status).toBe(201)
    const { doc } = (await created.json()) as { doc: { id: number } }
    const stored = await stack.api.findByID({
      collection: 'works',
      id: doc.id,
      draft: true,
      depth: 0,
    })
    expect(stored.physical).toMatchObject({ exportStatus: null })
    const publish = await stack.rest('PATCH', `/api/works/${doc.id}`, {
      role: 'contributor',
      json: { ...make(), _status: 'published' },
    })
    expect(publish.status).toBe(403)
    expect(JSON.stringify(await publish.json())).toMatch(/Contributors save drafts/)
    expect(
      (await stack.rest('POST', '/api/works', { role: 'editor', json: { title: 'x' } })).status,
    ).toBe(403)
  }, 60_000)

  it('refuses a person’s edit of a copy’s synced fields over REST, and lets its own fields change', async () => {
    const copy = await stack.api.create({
      collection: 'works',
      data: {
        title: 'Bali, 1726',
        objectType: 'map',
        origin: { brand: 'sister', workUid: 'IG-000001' },
      },
      context: { '@engine/sister:sync': true },
    })
    const edit = await stack.rest('PATCH', `/api/works/${copy.id}?draft=true`, {
      role: 'admin',
      json: { title: 'Bali, c. 1726', origin: { brand: 'sister', workUid: 'IG-000002' } },
    })
    expect(edit.status).toBe(400)
    const paths = (
      (await edit.json()) as { errors: Array<{ data?: { errors?: Array<{ path: string }> } }> }
    ).errors
      .flatMap((error) => error.data?.errors ?? [])
      .map((error) => error.path)
    expect(paths.sort()).toEqual(['origin', 'title'])
    const own = await stack.rest('PATCH', `/api/works/${copy.id}?draft=true`, {
      role: 'admin',
      json: { seo: { title: 'From the archive' } },
    })
    expect(own.status).toBe(200)
  })

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
      expect(committed.pending).toEqual([`work:${published.workUid}`])
      const visible = await stack.pool.query(
        `SELECT work_uid FROM works WHERE id = ${Number(doc.id)}`,
      )
      expect(visible.rows).toEqual([{ work_uid: published.workUid }])
      expect(await committed.flush()).toBe(1)
      expect(posts).toEqual([[`work:${published.workUid}`]])
    })
  })
})
