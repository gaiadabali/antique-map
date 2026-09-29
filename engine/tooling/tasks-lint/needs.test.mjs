import { describe, expect, it } from 'vitest'

import { expandNeedsToken, stripOwnerNote } from './needs.mjs'

describe('stripOwnerNote', () => {
  it('drops a trailing owner-input clause', () => {
    expect(stripOwnerNote('19.2.a · 👤 a Midtrans sandbox merchant account and keys')).toBe(
      '19.2.a',
    )
    expect(stripOwnerNote('17.1')).toBe('17.1')
  })
})

describe('expandNeedsToken', () => {
  it('resolves —, a task, a subtask and phase N', () => {
    expect(expandNeedsToken('—')).toEqual({ ids: [] })
    expect(expandNeedsToken('17.1')).toEqual({ ids: ['17.1'] })
    expect(expandNeedsToken('1.2.f')).toEqual({ ids: ['1.2.f'] })
    expect(expandNeedsToken('phase 10')).toEqual({ ids: [], phase: 10 })
    expect(expandNeedsToken('Phase 10')).toEqual({ ids: [], phase: 10 })
  })

  it('expands a task range and a subtask range', () => {
    expect(expandNeedsToken('10.1–10.3')).toEqual({ ids: ['10.1', '10.2', '10.3'] })
    expect(expandNeedsToken('1.2.a–1.2.d')).toEqual({ ids: ['1.2.a', '1.2.b', '1.2.c', '1.2.d'] })
  })

  it("resolves 10.3's own idiom without erroring", () => {
    expect(expandNeedsToken("each wave's merge")).toEqual({ ids: [], intraPhaseNote: true })
  })

  it('errors on garbage — the planted violation (2.2.i)', () => {
    expect(expandNeedsToken('nonsense').error).toBeTruthy()
    expect(expandNeedsToken('99.99.zz–1.1').error).toBeTruthy() // mismatched range kinds
  })
})
