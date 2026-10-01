import { describe, expect, it } from 'vitest'

import {
  changedSyncedPaths,
  comparable,
  holdsAny,
  isProvenanceCopy,
  originChanged,
  SYNCED_PATHS,
} from './work-synced'

const stored = {
  id: 9,
  title: 'Bali, 1726',
  objectType: 'map',
  makers: [{ id: 'a1', maker: 3, role: 'cartographer', certainty: 'certain' }],
  date: { precision: 'circa', from: 1726, to: null, display: null },
  publication: { place: 'Amsterdam', publisher: null, state: 'Second state' },
  dimensions: { image: { height: 280, width: 360 }, framed: { height: null, width: null } },
  rights: {
    status: 'public-domain',
    printAllowed: true,
    licenceRef: null,
    expires: '2030-01-01T00:00:00.000Z',
  },
  subjects: [4, 5],
  origin: { brand: 'origin-brand', workUid: 'IG-000123', syncedAt: '2026-09-30T10:00:00.000Z' },
}

describe('a provenance copy’s synced fields (C12 WorkSnapshot)', () => {
  it('are exactly what a snapshot carries, never the copy’s own uid, images or SEO', () => {
    expect(SYNCED_PATHS).toContain('title')
    expect(SYNCED_PATHS).toContain('publication.edition')
    expect(SYNCED_PATHS).not.toContain('publication.state')
    for (const own of ['workUid', 'images', 'seo', 'physical', 'description', 'origin']) {
      expect(SYNCED_PATHS).not.toContain(own)
    }
  })

  it('sees the admin re-sending what is stored as no change', () => {
    const resent = {
      title: 'Bali, 1726',
      makers: [
        {
          id: 'a1',
          maker: { id: 3, name: 'Valentijn', createdAt: 'x' },
          role: 'cartographer',
          certainty: 'certain',
        },
      ],
      date: { precision: 'circa', from: 1726, display: '' },
      publication: { place: 'Amsterdam', publisher: '', state: 'Third state' },
      dimensions: { image: { height: 280, width: 360 }, framed: { height: 500, width: 600 } },
      rights: {
        status: 'public-domain',
        printAllowed: true,
        licenceRef: 'L-1',
        expires: '2030-01-01',
      },
      subjects: ['4', '5'],
    }
    expect(changedSyncedPaths(resent, stored)).toEqual([])
  })

  it('names each synced path an edit changes, and only those', () => {
    expect(
      changedSyncedPaths(
        {
          title: 'Bali, c. 1726',
          makers: [{ maker: 3, role: 'engraver', certainty: 'certain' }],
          publication: { place: 'Dordrecht' },
          rights: { printAllowed: false },
          subjects: [4],
          seo: { title: 'Free to change' },
        },
        stored,
      ),
    ).toEqual(['title', 'makers', 'publication.place', 'subjects', 'rights.printAllowed'])
  })

  it('treats blanks alike and a populated relation as its id', () => {
    expect(comparable('')).toBeNull()
    expect(comparable([])).toBeNull()
    expect(comparable({ a: null, b: undefined })).toBeNull()
    expect(comparable({ id: 3, createdAt: 'x', name: 'y' })).toBe(3)
    expect(comparable([{ id: 'row', place: '7' }])).toEqual([{ place: 7 }])
  })

  it('knows a copy by its origin, and an edit to origin as a change', () => {
    expect(isProvenanceCopy(stored.origin)).toBe(true)
    expect(isProvenanceCopy({ workUid: '' })).toBe(false)
    expect(isProvenanceCopy(null)).toBe(false)
    expect(originChanged({ origin: { ...stored.origin } }, stored)).toBe(false)
    expect(originChanged({ origin: { ...stored.origin, workUid: 'IG-000124' } }, stored)).toBe(true)
    expect(originChanged({ title: 'x' }, stored)).toBe(false)
  })

  it('finds no physical record in an admin form’s blank, unticked group', () => {
    expect(
      holdsAny({ location: null, exportStatus: null, coaIssued: false, acquisition: {} }),
    ).toBe(false)
    expect(holdsAny({ exportStatus: 'cleared' })).toBe(true)
    expect(holdsAny({ coaIssued: true })).toBe(true)
  })
})
