/**
 * The originals lookup on a real database (TASKS.md 23.5.d): a published work is found by its stock
 * number; a work never published, or pulled back to draft, is not — the visitor's access and the
 * `_status` filter, not the caller, keep a draft out. Without `CMS_TEST_POSTGRES_URL` it skips.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { findOriginal } from './find'
import {
  startWorksStack,
  vocabulary,
  type WorksStack,
} from '../../../../../../packages/cms/src/collections/works/works.test-support'

const ORIGIN = 'https://gallery.example.test'

describe.skipIf(!process.env.CMS_TEST_POSTGRES_URL)('the originals lookup and drafts', () => {
  let stack: WorksStack

  const write = (op: 'create' | 'update', args: Record<string, unknown>) =>
    invalidationBatch().operation((context) =>
      stack.api[op]({ ...args, context, overrideAccess: true }),
    )

  beforeAll(async () => {
    stack = await startWorksStack('web_originals_test', (config, key) =>
      getPayload({ config, key }),
    )
    const base = await vocabulary(stack.api)
    const recto = await stack.media('recto')
    const work = (stockNumber: string, title: string, status: 'published' | 'draft') =>
      write('create', {
        collection: 'works',
        data: {
          title,
          stockNumber,
          objectType: 'map',
          date: { precision: 'circa', from: 1726 },
          makers: [{ maker: base.maker, role: 'cartographer', certainty: 'attributed' }],
          subjects: [base.subject],
          condition: { grade: base.grade },
          images: [{ media: recto }],
          _status: status,
        },
        ...(status === 'draft' ? { draft: true } : {}),
      })
    await work('M.101', 'Published map', 'published')
    await work('M.102', 'Draft map', 'draft')
    const pulled = await work('M.103', 'Unpublished map', 'published')
    await write('update', { collection: 'works', id: pulled.id, data: { _status: 'draft' } })
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  it('finds a published work, projected to its title and page', async () => {
    const found = await findOriginal(stack.payload, 'M.101', 'en', ORIGIN, '')
    expect(found?.work).toMatchObject({ stockNumber: 'M.101', title: 'Published map' })
    expect(found?.work.url).toMatch(
      /^https:\/\/gallery\.example\.test\/product\/\d+-published-map$/,
    )
    // No bucket here, so no derivative: the staff-only file is never sent instead.
    expect(found?.work.image).toBeNull()
    expect(Object.keys(found?.work ?? {}).sort()).toEqual(['image', 'stockNumber', 'title', 'url'])
  })

  it('finds no draft, nor a work pulled back to draft, nor an unknown number', async () => {
    expect(await findOriginal(stack.payload, 'M.102', 'en', ORIGIN, '')).toBeNull()
    expect(await findOriginal(stack.payload, 'M.103', 'en', ORIGIN, '')).toBeNull()
    expect(await findOriginal(stack.payload, 'M.999', 'en', ORIGIN, '')).toBeNull()
  })
})
