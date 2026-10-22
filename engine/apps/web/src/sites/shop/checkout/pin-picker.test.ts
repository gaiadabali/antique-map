/**
 * `parseCoordinate` (6-followup): a typed lat/lng field counts only when its trimmed text is
 * non-empty and parses to a finite number — `Number('')` is `0`, which used to read as a pin
 * near (0, 0) while a field was still empty.
 *
 * `pickPin` (6-followup-4 #1): the repo has no jsdom, so `PinPicker` itself cannot be rendered and
 * dragged in a test; `pickPin` is the pure decision `pick()` delegates to, so these two scenarios
 * are exercised directly instead.
 */
import { describe, expect, it, vi } from 'vitest'

import { parseCoordinate, pickPin, type Pin } from './pin-picker'

describe('parseCoordinate', () => {
  it.each([
    ['', null],
    ['  ', null],
    ['-', null],
    ['abc', null],
    ['-8.6705', -8.6705],
    ['115.2126', 115.2126],
    ['1e400', null],
  ])('parseCoordinate(%j) -> %j', (input, expected) => {
    expect(parseCoordinate(input)).toBe(expected)
  })
})

describe('pickPin', () => {
  it('a pin typed then submitted at once carries lat and lng', () => {
    const onPin = vi.fn()
    const next: Pin = { lat: -8.6705, lng: 115.2126 }
    let resolveAddress: ((address: string | null) => void) | undefined
    const resolve = () => new Promise<string | null>((r) => (resolveAddress = r))

    pickPin(next, true, { latestRef: { current: null }, onPin, resolveAddress: resolve })

    // The coordinates are there synchronously — a submit that reads them right away (before the
    // reverse geocode answers) still has both.
    expect(onPin).toHaveBeenCalledWith(next, null)
    expect(onPin).toHaveBeenCalledTimes(1)
    resolveAddress?.('Jl. Example')
  })

  it('a stale reverse-geocode address never replaces a newer pin', async () => {
    const onPin = vi.fn()
    const latestRef = { current: null as Pin | null }
    const first: Pin = { lat: -8.6705, lng: 115.2126 }
    const second: Pin = { lat: -8.79, lng: 115.17 }
    let resolveFirst: ((address: string | null) => void) | undefined

    pickPin(first, true, {
      latestRef,
      onPin,
      resolveAddress: () => new Promise((r) => (resolveFirst = r)),
    })
    // A second pin lands before the first pin's address comes back.
    pickPin(second, false, { latestRef, onPin, resolveAddress: () => Promise.resolve(null) })
    resolveFirst?.('Stale address for the first pin')
    await Promise.resolve()
    await Promise.resolve()

    expect(onPin).not.toHaveBeenCalledWith(first, 'Stale address for the first pin')
    expect(onPin).toHaveBeenCalledWith(second, null)
  })
})
