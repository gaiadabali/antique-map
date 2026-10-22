import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { viewingItemOf } from './run-case'
import type { EvalCase } from './schema'

const ids = new Map([
  ['w1', '1'],
  ['w2', '2'],
  ['p1', 'p1'],
])
const withFixtures = (fixtures: EvalCase['fixtures']) => ({ fixtures }) as unknown as EvalCase
const work = (id: string) => ({ id })

describe('viewingItemOf', () => {
  it("is the lone fixture item's real id", () => {
    expect(viewingItemOf(withFixtures({ works: [work('w1')] as never }), ids)).toBe('1')
    expect(viewingItemOf(withFixtures({ products: [work('p1')] as never }), ids)).toBe('p1')
  })
  it('is null for several items or none', () => {
    expect(
      viewingItemOf(withFixtures({ works: [work('w1'), work('w2')] as never }), ids),
    ).toBeNull()
    expect(viewingItemOf(withFixtures({ works: [] }), ids)).toBeNull()
    expect(viewingItemOf(withFixtures(undefined), ids)).toBeNull()
  })
})
