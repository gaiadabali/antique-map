/**
 * The vocabulary's invalidation hooks without a database: which saves of a place, maker or term
 * hand `catalogue:gallery` to the caller's collector, which hand nothing, and that the three
 * collections run them after the commit. Their database proof is `vocabulary-invalidate.db.test.ts`.
 */
import { invalidationBatch } from '@engine/cache'
import { describe, expect, it } from 'vitest'

import { Makers } from '../collections/makers'
import { Places } from '../collections/places'
import { Terms } from '../collections/terms'
import {
  invalidateVocabularyOnChange,
  invalidateVocabularyOnDelete,
  VOCABULARY_TAGS,
} from './vocabulary-invalidate'

const java = { id: 7, name: 'Java', slug: 'java', _status: 'published' }
const draft = { ...java, _status: 'draft' }

/** The tags one change hands to a fresh collector. */
async function changed(doc: object, previousDoc: object): Promise<readonly string[]> {
  const batch = invalidationBatch()
  await batch.operation((context) =>
    invalidateVocabularyOnChange({ doc, previousDoc, context } as never),
  )
  return batch.pending
}

async function deleted(doc: object): Promise<readonly string[]> {
  const batch = invalidationBatch()
  await batch.operation((context) => invalidateVocabularyOnDelete({ doc, context } as never))
  return batch.pending
}

describe('a place, maker or term change expires the gallery’s listings, after the commit', () => {
  it('names the gallery’s catalogue tag, made by the builder', () => {
    expect(VOCABULARY_TAGS).toEqual(['catalogue:gallery'])
  })

  it('a publish — created published, or a draft published', async () => {
    expect(await changed(java, {})).toEqual(['catalogue:gallery'])
    expect(await changed(java, draft)).toEqual(['catalogue:gallery'])
  })

  it('an edit of a published place: a rename, a new historical name, a re-parenting', async () => {
    for (const doc of [
      { ...java, name: 'Jawa' },
      { ...java, historicalNames: [{ name: 'Iava', language: 'la', period: '1600s' }] },
      { ...java, parent: 3 },
    ]) {
      expect(await changed(doc, java), JSON.stringify(doc)).toEqual(['catalogue:gallery'])
    }
  })

  it('an unpublish, and a draft saved over a published record', async () => {
    expect(await changed(draft, java)).toEqual(['catalogue:gallery'])
  })

  it('a delete of a published record; never of a draft', async () => {
    expect(await deleted(java)).toEqual(['catalogue:gallery'])
    expect(await deleted(draft)).toEqual([])
  })

  it('nothing for a save the public never saw: a draft created, a draft over a draft', async () => {
    expect(await changed(draft, {})).toEqual([])
    expect(await changed({ ...draft, name: 'Jawa' }, draft)).toEqual([])
  })

  it('a draft over a draft: the catalogue when the record was ever published — it may be the unpublish', async () => {
    const asked: unknown[] = []
    const update = async (published: number) => {
      const req = {
        payload: {
          countVersions: async (args: unknown) => {
            asked.push(args)
            return { totalDocs: published }
          },
        },
      }
      const batch = invalidationBatch()
      await batch.operation((context) =>
        invalidateVocabularyOnChange({
          collection: { slug: 'places' },
          doc: draft,
          previousDoc: draft,
          operation: 'update',
          req,
          context,
        } as never),
      )
      return batch.pending
    }
    expect(await update(1)).toEqual(['catalogue:gallery'])
    expect(await update(0)).toEqual([])
    expect(asked[0]).toMatchObject({
      collection: 'places',
      where: { and: [{ parent: { equals: 7 } }, { 'version._status': { equals: 'published' } }] },
    })
  })

  it('returns the saved document unchanged', async () => {
    const batch = invalidationBatch()
    let returned: unknown
    await batch.operation(async (context) => {
      returned = await invalidateVocabularyOnChange({
        doc: java,
        previousDoc: {},
        context,
      } as never)
    })
    expect(returned).toBe(java)
  })

  it('outside a request with no collector, fails the save rather than leave a stale listing', async () => {
    await expect(
      invalidateVocabularyOnChange({ doc: java, previousDoc: {}, context: {} } as never),
    ).rejects.toThrow(/outside a request scope/)
    expect(() => invalidateVocabularyOnDelete({ doc: java, context: {} } as never)).toThrow(
      /outside a request scope/,
    )
  })

  it.each([
    ['places', Places],
    ['makers', Makers],
    ['terms', Terms],
  ] as const)('%s runs them after the change and the delete', (_slug, collection) => {
    expect(collection.hooks?.afterChange).toEqual([invalidateVocabularyOnChange])
    expect(collection.hooks?.afterDelete).toEqual([invalidateVocabularyOnDelete])
  })
})
