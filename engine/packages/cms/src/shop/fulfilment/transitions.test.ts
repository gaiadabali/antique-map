import { describe, expect, it } from 'vitest'

import { ORDER_STATUSES, type OrderStatus } from '../../collections/orders/statuses'
import type { UserRole } from '../../collections/users/roles'
import { judgeMove, returnsStock, type MoveQuestion } from './transitions'

const ask = (over: Partial<MoveQuestion>): MoveQuestion => ({
  role: 'store',
  actorStore: 1,
  orderStore: 1,
  from: 'paid',
  to: 'processing',
  hasDriverImage: true,
  ...over,
})
const verdict = (over: Partial<MoveQuestion>) => {
  const judged = judgeMove(ask(over))
  return judged.ok ? 'ok' : judged.refusal
}

const LINE: OrderStatus[] = ['paid', 'processing', 'waiting_driver', 'on_the_way', 'delivered']

/** Every legal move for a role, as `from→to`, from the whole status × status table. */
function legal(role: UserRole): string[] {
  const moves: string[] = []
  for (const from of ORDER_STATUSES) {
    for (const to of ORDER_STATUSES) {
      if (judgeMove(ask({ role, from, to, actorStore: role === 'store' ? 1 : null })).ok) {
        moves.push(`${from}→${to}`)
      }
    }
  }
  return moves
}

describe('the transition table', () => {
  it('store staff: exactly one step forward along the line, nothing else', () => {
    expect(legal('store')).toEqual([
      'paid→processing',
      'processing→waiting_driver',
      'waiting_driver→on_the_way',
      'on_the_way→delivered',
    ])
  })

  it('owner and editor: any step forward, one back, and a cancel before delivery', () => {
    const expected = [
      'pending_payment→cancelled',
      'paid→processing',
      'paid→waiting_driver',
      'paid→on_the_way',
      'paid→delivered',
      'paid→cancelled',
      'processing→paid',
      'processing→waiting_driver',
      'processing→on_the_way',
      'processing→delivered',
      'processing→cancelled',
      'waiting_driver→processing',
      'waiting_driver→on_the_way',
      'waiting_driver→delivered',
      'waiting_driver→cancelled',
      'on_the_way→waiting_driver',
      'on_the_way→delivered',
      'on_the_way→cancelled',
      'delivered→on_the_way',
    ]
    expect(legal('owner')).toEqual(expected)
    expect(legal('editor')).toEqual(expected)
  })

  it('names why a store user is refused', () => {
    expect(verdict({ from: 'processing', to: 'paid' })).toBe('move_not_allowed')
    expect(verdict({ from: 'paid', to: 'waiting_driver' })).toBe('move_not_allowed')
    expect(verdict({ from: 'paid', to: 'cancelled' })).toBe('move_not_allowed')
    expect(verdict({ from: 'pending_payment', to: 'paid' })).toBe('move_not_allowed')
    expect(verdict({ orderStore: 2 })).toBe('not_your_store')
    expect(verdict({ actorStore: null })).toBe('not_your_store')
    expect(verdict({ from: 'paid', to: 'paid' })).toBe('no_change')
  })

  it('refuses anyone who is not staff before looking at the move', () => {
    expect(verdict({ role: null, actorStore: null })).toBe('not_staff')
  })

  it('needs the driver image to go on the way — forward only, for every role', () => {
    for (const role of ['store', 'owner', 'editor'] as const) {
      const actorStore = role === 'store' ? 1 : null
      expect(
        verdict({
          role,
          actorStore,
          from: 'waiting_driver',
          to: 'on_the_way',
          hasDriverImage: false,
        }),
      ).toBe('driver_image_required')
    }
    // A correction back from delivered does not ask for it again.
    expect(
      verdict({
        role: 'owner',
        actorStore: null,
        from: 'delivered',
        to: 'on_the_way',
        hasDriverImage: false,
      }),
    ).toBe('ok')
  })

  it('returns stock on a cancel from a holding status only', () => {
    for (const from of ['pending_payment', 'paid', 'processing', 'waiting_driver'] as const) {
      expect(returnsStock(from, 'cancelled')).toBe(true)
    }
    expect(returnsStock('on_the_way', 'cancelled')).toBe(false)
    for (const from of LINE) for (const to of LINE) expect(returnsStock(from, to)).toBe(false)
    const judged = judgeMove(ask({ role: 'owner', actorStore: null, to: 'cancelled' }))
    expect(judged).toEqual({ ok: true, returnsStock: true })
  })
})
