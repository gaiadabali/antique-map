/**
 * TASKS.md 3.2.d and 3.2.c on a real Postgres: the asking price is the owner's alone, in whole US
 * dollars, and an editor can publish a complete work. The schema is pushed (`./works.test-support`);
 * without `CMS_TEST_POSTGRES_URL` it skips.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { refusedWith } from '../places/pushed-database.test-support'
import { server, startWorksStack, vocabulary, type WorksStack } from './works.test-support'

describe.skipIf(!server)('works: the asking price and an editor publishing', () => {
  let stack: WorksStack
  let ids: Awaited<ReturnType<typeof vocabulary>>
  let recto: number
  let verso: number

  beforeAll(async () => {
    stack = await startWorksStack('cms_works_price_test', (config, key) =>
      getPayload({ config, key }),
    )
    ids = await vocabulary(stack.api)
    recto = await stack.media('recto')
    verso = await stack.media('verso')
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const complete = () => ({
    title: 'Bali by François Valentijn, c. 1726',
    objectType: 'map',
    date: { precision: 'circa', from: 1726 },
    makers: [{ maker: ids.maker, role: 'cartographer', certainty: 'attributed' }],
    places: [{ place: ids.place, role: 'depicts', primary: true }],
    subjects: [ids.subject],
    references: [{ citation: 'Tooley (Australia) 1268' }],
    condition: { grade: ids.grade, notes: 'Light toning.' },
    images: [{ media: recto }, { media: verso, caption: 'Verso: blank' }],
    dimensions: { image: { height: 280, width: 360 }, sheet: { height: 310, width: 400 } },
  })

  it('shows the asking price to the owner alone, and never to an editor or the public', async () => {
    // A draft over REST (an editor may not even write the field), then the owner records it.
    const created = await stack.rest('POST', '/api/works?draft=true', {
      role: 'editor',
      json: { title: 'Priced drawer find' },
    })
    expect(created.status).toBe(201)
    const { doc } = (await created.json()) as { doc: { id: number } }
    const { docs: owners } = await stack.api.find({
      collection: 'users',
      where: { role: { equals: 'owner' } },
      depth: 0,
    })
    const owner = { ...owners[0]!, collection: 'users' }
    const priced = await invalidationBatch().operation((context) =>
      stack.api.update({
        collection: 'works',
        id: doc.id,
        data: { ...complete(), askingPrice: 18_000, _status: 'published' },
        overrideAccess: false,
        user: owner,
        context,
      }),
    )
    expect(priced.askingPrice).toBe(18_000)
    const read = async (role?: 'owner' | 'editor') =>
      (await (await stack.rest('GET', `/api/works/${doc.id}?depth=0`, { role })).json()) as Record<
        string,
        unknown
      >
    expect(await read('owner')).toMatchObject({ askingPrice: 18_000 })
    expect(await read('editor')).not.toHaveProperty('askingPrice')
    expect(await read()).not.toHaveProperty('askingPrice')
    // Whole US dollars, nothing else.
    const errors = await refusedWith(() =>
      stack.api.update({ collection: 'works', id: doc.id, data: { askingPrice: 18_000.5 } }),
    )
    expect(errors).toMatchObject({ askingPrice: expect.stringMatching(/Whole US dollars/) })
  }, 60_000)

  it('lets an editor publish a complete work', async () => {
    const { docs: editors } = await stack.api.find({
      collection: 'users',
      where: { role: { equals: 'editor' } },
      depth: 0,
    })
    const editor = { ...editors[0]!, collection: 'users' }
    const draft = await stack.api.create({ collection: 'works', data: { title: 'Editor’s find' } })
    const published = await invalidationBatch().operation((context) =>
      stack.api.update({
        collection: 'works',
        id: draft.id,
        data: { ...complete(), _status: 'published' },
        overrideAccess: false,
        user: editor,
        context,
      }),
    )
    expect(published._status).toBe('published')
    expect(published.publicId).toBeGreaterThanOrEqual(100_000)
  })
})
