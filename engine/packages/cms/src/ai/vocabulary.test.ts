/**
 * Matching drafted names to existing rows, without a database (TASKS.md 8.3.a): a name the model
 * wrote is a search term, never a wildcard, and only an exact (case and spacing aside) hit counts.
 */
import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'

import { likeTerm, matchVocabulary } from './vocabulary'

type FindArgs = { collection: string; where: unknown }

function stub(docs: Record<string, Record<string, unknown>[]>) {
  const calls: FindArgs[] = []
  const payload = {
    find: async (args: FindArgs) => {
      calls.push(args)
      return { docs: docs[args.collection] ?? [] }
    },
  } as unknown as Payload
  return { payload, calls }
}

describe('drafted names against the vocabulary (8.3.a)', () => {
  it('takes the wildcards and empty words out of a model-written name', () => {
    expect(likeTerm('%')).toBe('')
    expect(likeTerm('Java  _Sea\\')).toBe('Java Sea')
    expect(likeTerm(' Batavia ')).toBe('Batavia')
  })

  it('does not search at all for a name that is only wildcards, and matches nothing for it', async () => {
    const { payload, calls } = stub({ places: [{ id: 1, name: 'Bali' }] })
    const out = await matchVocabulary(payload, {}, ['%', '_ _'], ['%%'])
    expect(calls).toEqual([])
    expect(out).toMatchObject({ places: [], subjects: [], unmatchedPlaces: ['%', '_ _'] })
  })

  it('sends only cleaned terms, and keeps exact matches only', async () => {
    const { payload, calls } = stub({
      places: [
        { id: 1, name: 'Bali' },
        { id: 2, name: 'Bali Strait' },
        { id: 3, name: 'Jakarta', historicalNames: [{ name: 'Batavia' }] },
      ],
    })
    const out = await matchVocabulary(payload, {}, ['bali', 'batavia', 'Bal%'], [])
    expect(JSON.stringify(calls[0]!.where)).not.toMatch(/%/)
    expect(out.places).toEqual([1, 3])
    expect(out.unmatchedPlaces).toEqual(['Bal%'])
  })
})
