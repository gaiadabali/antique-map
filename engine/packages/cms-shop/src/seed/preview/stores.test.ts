/** The client preview's stores step: it sets regions and flagships on the seed stores only. */
import { describe, expect, it, vi } from 'vitest'

import type { Doc, Step } from './shared'

const docs: Doc[] = []
vi.mock('./shared', () => ({
  allOf: async () => docs,
  writeOf: () => ({}),
}))

import { seedStoreRegions } from './stores'

const updates: Array<{ id: number; data: Record<string, unknown> }> = []
const step = {
  payload: {
    update: async (args: { id: number; data: Record<string, unknown> }) => {
      updates.push({ id: args.id, data: args.data })
    },
  },
} as unknown as Step

describe('seedStoreRegions', () => {
  it('sets region and flagship on seed stores as before', async () => {
    docs.length = 0
    updates.length = 0
    docs.push(
      { id: 1, name: 'Seed store, Area 001', area: 'Ubud' },
      { id: 2, name: 'Seed store, Area 002', area: 'ubud' },
      { id: 3, name: 'Seed store, Area 003', area: 'Denpasar' },
    )
    const report = await seedStoreRegions(step)
    expect(report).toEqual({ stores: 3, changed: 2, flagships: 1 })
    expect(updates).toEqual([
      { id: 1, data: { region: 'ubud', flagship: true } },
      { id: 2, data: { region: 'ubud', flagship: false } },
    ])
  })

  it("never touches a real store: it keeps the owner's region and flagship", async () => {
    docs.length = 0
    updates.length = 0
    docs.push(
      { id: 10, name: 'Toko 1', area: 'Canggu', region: 'amed', flagship: false },
      { id: 11, name: 'Toko 2', area: 'Ubud', region: 'lombok', flagship: true },
      { id: 12, name: 'Seed store, Area 001', area: 'Ubud' },
    )
    const report = await seedStoreRegions(step)
    expect(report.stores).toBe(1)
    // The seed store is the first Ubud one among the seed stores, not the real store at id 11.
    expect(updates).toEqual([{ id: 12, data: { region: 'ubud', flagship: true } }])
  })

  it('a store with another name is real too, and a second run writes nothing', async () => {
    docs.length = 0
    updates.length = 0
    docs.push(
      { id: 20, area: 'Ubud' },
      { id: 21, name: 'Seed store, Area 001', area: 'Amed', region: 'amed', flagship: false },
    )
    const report = await seedStoreRegions(step)
    expect(report).toEqual({ stores: 1, changed: 0, flagships: 0 })
    expect(updates).toEqual([])
  })
})
