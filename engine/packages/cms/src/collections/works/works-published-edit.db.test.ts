/**
 * TASKS.md 1.2.b on a real Postgres: an edit of a work that is already published — a save that
 * sends no `_status` and is no draft, so Payload keeps the record published — is a publish, and
 * meets the publish guard and the contributor's drafts-only rule like one. Both guards read
 * `data._status`, which Payload 3.90 fills from the stored record before a collection's
 * `beforeChange` hooks run; were that to change, a REST `PATCH` leaving `_status` out would strip
 * a live work's title or recto unrefused and a contributor would edit the live record. These
 * tests pin it.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { refusedWith } from '../places/pushed-database.test-support'
import { server, startWorksStack, vocabulary, type WorksStack } from './works.test-support'

describe.skipIf(!server)('works: editing a published work on a real database', () => {
  let stack: WorksStack
  let make: () => Record<string, unknown>

  beforeAll(async () => {
    stack = await startWorksStack('cms_works_live_test', (config, key) =>
      getPayload({ config, key }),
    )
    const ids = await vocabulary(stack.api)
    const recto = await stack.media('recto')
    make = () => ({
      title: 'Bali by François Valentijn, c. 1726',
      objectType: 'map',
      date: { precision: 'circa', from: 1726 },
      makers: [{ maker: ids.maker, role: 'cartographer', certainty: 'certain' }],
      condition: { grade: ids.grade },
      images: [{ media: recto }],
    })
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const publishOne = () =>
    invalidationBatch().operation((context) =>
      stack.api.create({
        collection: 'works',
        data: { ...make(), _status: 'published' },
        context,
      }),
    )
  const stored = (id: number) => stack.api.findByID({ collection: 'works', id, depth: 0 })

  it('refuses a REST edit that leaves _status out and would strip a live work’s title and recto', async () => {
    const work = await publishOne()
    const response = await stack.rest('PATCH', `/api/works/${work.id}`, {
      role: 'cataloguer',
      json: { title: '', images: [] },
    })
    expect(response.status).toBe(400)
    expect(JSON.stringify(await response.json())).toMatch(/title in English/)
    expect(await stored(work.id)).toMatchObject({
      _status: 'published',
      title: 'Bali by François Valentijn, c. 1726',
    })
  }, 60_000)

  it('refuses the same edit on the Local API', async () => {
    const work = await publishOne()
    const errors = await refusedWith(() =>
      invalidationBatch().operation((context) =>
        stack.api.update({
          collection: 'works',
          id: work.id,
          data: { condition: { grade: null } },
          context,
        }),
      ),
    )
    expect(errors).toEqual({ 'condition.grade': expect.stringMatching(/Grade the condition/) })
  }, 60_000)

  it('lets a valid edit of a live work through, and a draft over it save incomplete', async () => {
    const work = await publishOne()
    const edited = await invalidationBatch().operation((context) =>
      stack.api.update({
        collection: 'works',
        id: work.id,
        data: { originalTitle: 'Kaart van het Eyland Bali' },
        context,
      }),
    )
    expect(edited._status).toBe('published')
    await invalidationBatch().operation((context) =>
      stack.api.update({
        collection: 'works',
        id: work.id,
        data: { title: '' },
        draft: true,
        context,
      }),
    )
    expect(await stored(work.id)).toMatchObject({
      _status: 'published',
      title: 'Bali by François Valentijn, c. 1726',
      originalTitle: 'Kaart van het Eyland Bali',
    })
  }, 60_000)

  it('refuses a contributor’s direct edit of a live work over REST', async () => {
    const work = await publishOne()
    const live = await stack.rest('PATCH', `/api/works/${work.id}`, {
      role: 'contributor',
      json: { title: 'Retitled by a contributor' },
    })
    expect(live.status).toBe(403)
    expect(JSON.stringify(await live.json())).toMatch(/Contributors save drafts/)
    expect((await stored(work.id)).title).toBe('Bali by François Valentijn, c. 1726')
  }, 60_000)
})
