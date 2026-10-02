/**
 * TASKS.md 8.2.g on a real Postgres: a maker, place, term or source a work still references —
 * as stored or in its latest draft — cannot be deleted ("still used by N works"); and a work's
 * duplicate is a new object, its stock number held to the gallery's pattern. The schema is pushed
 * (`./works.test-support`); without `CMS_TEST_POSTGRES_URL` it skips.
 */
import { APIError, getPayload, ValidationError } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { server, startWorksStack, vocabulary, type WorksStack } from './works.test-support'

describe.skipIf(!server)('works: references and duplicates on a real database', () => {
  let stack: WorksStack
  let ids: Awaited<ReturnType<typeof vocabulary>>

  beforeAll(async () => {
    stack = await startWorksStack('cms_works_refs_test', (config, key) =>
      getPayload({ config, key }),
    )
    ids = await vocabulary(stack.api)
    // A work that references the place, both terms and the source.
    await stack.api.create({
      collection: 'works',
      data: {
        places: [{ place: ids.place, role: 'depicts', primary: true }],
        subjects: [ids.subject],
        condition: { grade: ids.grade },
        references: [{ source: ids.source, ref: '1268' }],
      },
    })
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  it('refuses to delete a maker, place, term or source a work references — stored or drafted', async () => {
    const { api } = stack
    const maker = await api.create({
      collection: 'makers',
      data: { name: 'Blaeu', sortName: 'BLAEU' },
    })
    const loose = await api.create({
      collection: 'makers',
      data: { name: 'Unused', sortName: 'UNUSED' },
    })
    const work = await api.create({
      collection: 'works',
      data: { makers: [{ maker: maker.id, role: 'publisher', certainty: 'certain' }] },
    })
    const refusal = api.delete({ collection: 'makers', id: maker.id })
    await expect(refusal).rejects.toBeInstanceOf(APIError)
    await expect(refusal).rejects.toThrow(/still used by 1 work /)
    for (const [collection, id] of [
      ['places', ids.place],
      ['terms', ids.grade],
      ['terms', ids.subject],
      ['sources', ids.source],
    ] as const) {
      await expect(api.delete({ collection, id })).rejects.toThrow(/still used by \d+ works? /)
    }
    await api.delete({ collection: 'makers', id: loose.id })
    // Referenced only in the work's latest draft: still refused.
    await api.update({ collection: 'works', id: work.id, data: { makers: [] } })
    const drafted = await api.create({
      collection: 'makers',
      data: { name: 'Hondius', sortName: 'HONDIUS' },
    })
    await api.update({
      collection: 'works',
      id: work.id,
      draft: true,
      data: { makers: [{ maker: drafted.id, role: 'engraver', certainty: 'certain' }] },
    })
    await expect(api.delete({ collection: 'makers', id: drafted.id })).rejects.toThrow(
      /still used by 1 work /,
    )
    await api.update({ collection: 'works', id: work.id, draft: true, data: { makers: [] } })
    await api.delete({ collection: 'makers', id: maker.id })
    expect(
      (await api.find({ collection: 'makers', where: { id: { equals: maker.id } } })).docs,
    ).toEqual([])
  })

  it('makes a duplicate a new object: a new uid, no stock number, no physical record', async () => {
    const original = await stack.api.create({
      collection: 'works',
      data: { title: 'Original', stockNumber: 'M.1044', legacy: { productId: 501 } },
    })
    const copy = await (
      stack.payload as unknown as {
        duplicate: (args: object) => Promise<Record<string, unknown>>
      }
    ).duplicate({ collection: 'works', id: original.id })
    expect(original).toMatchObject({ stockNumber: 'M.1044', legacy: { productId: 501 } })
    expect(copy.workUid).not.toBe(original.workUid)
    expect(copy).toMatchObject({ title: 'Original', stockNumber: null })
    expect((copy.legacy as { productId?: unknown }).productId ?? null).toBeNull()
  })

  it('refuses a stock number off the gallery’s pattern', async () => {
    const error = await stack.api
      .create({ collection: 'works', data: { stockNumber: 'T.1' } })
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ValidationError)
  })
})
