// The tracking photo's route (`/api/x/track/{token}/driver-image`) spends the same per-address
// guess budget as `/track/{token}` and `/order/{token}` (TASKS.md 7.3.c): a token the page already
// presented is free again for its photo, a new one counts, and the eleventh is a 429.
import { afterEach, describe, expect, it } from 'vitest'

import { decideProxy } from './route'
import { resetTrackingGuessLimit, TRACKING_GUESSES_PER_MINUTE } from './tracking-rate-limit'

const ENV = { GALLERY_HOSTS: 'gallery.localhost', SHOP_HOSTS: 'shop.localhost', PORT: '4230' }

const decide = (path: string, address: string) =>
  decideProxy(
    {
      url: new URL(path, 'http://localhost:4230'),
      headers: new Headers({ host: 'shop.localhost:4230', 'x-forwarded-for': address }),
    },
    { env: ENV },
  )
const photo = (token: string, address = '9.9.9.9') =>
  decide(`/api/x/track/${token}/driver-image`, address)

afterEach(() => resetTrackingGuessLimit())

describe('the tracking photo route shares the tracking guess budget', () => {
  it('passes the route on, counted by its token', () => {
    expect(photo('abc')).toMatchObject({ kind: 'next', why: 'api', status: null })
  })

  it('the 11th new token in a minute is a 429 with Retry-After, on the photo route too', () => {
    for (let i = 0; i < TRACKING_GUESSES_PER_MINUTE; i++) {
      expect(photo(`g${i}`), `request ${i + 1}`).toMatchObject({ kind: 'next' })
    }
    const eleventh = photo('g-new')
    expect(eleventh).toMatchObject({ kind: 'respond', why: 'rate-limited', status: 429 })
    expect(Number(eleventh.setResponse['Retry-After'])).toBeGreaterThan(0)
  })

  it('is one budget with the pages: a page’s tokens and photo tokens count together', () => {
    for (let i = 0; i < TRACKING_GUESSES_PER_MINUTE - 1; i++) {
      expect(decide(`/track/p${i}`, '9.9.9.9')).toMatchObject({ kind: 'rewrite' })
    }
    expect(photo('last')).toMatchObject({ kind: 'next' })
    expect(photo('one-too-many')).toMatchObject({ status: 429 })
    expect(decide('/track/another', '9.9.9.9')).toMatchObject({ status: 429 })
  })

  it('a token the page already presented is free for its photo, however often it loads', () => {
    for (let i = 0; i < TRACKING_GUESSES_PER_MINUTE; i++) decide(`/track/m${i}`, '9.9.9.9')
    expect(photo('m0')).toMatchObject({ kind: 'next' })
    expect(photo('m0')).toMatchObject({ kind: 'next' })
    expect(photo('brand-new')).toMatchObject({ status: 429 })
  })

  it('counts a percent-encoded token as the page’s decoded one, and per address', () => {
    for (let i = 0; i < TRACKING_GUESSES_PER_MINUTE - 1; i++) decide(`/track/e${i}`, '9.9.9.9')
    decide('/track/a b', '9.9.9.9')
    // The budget is full (10 tokens), and `a%20b` is the page's own `a b`: already counted, free.
    expect(photo('a%20b')).toMatchObject({ kind: 'next' })
    expect(photo('other')).toMatchObject({ status: 429 })
    expect(photo('other', '4.4.4.4')).toMatchObject({ kind: 'next' })
  })

  it('never counts another engine route, or a longer path under the same prefix', () => {
    for (let i = 0; i < TRACKING_GUESSES_PER_MINUTE; i++) photo(`n${i}`)
    for (const path of ['/api/x/track', '/api/x/track/t/other', '/api/x/track/t/driver-image/x']) {
      expect(decide(path, '9.9.9.9'), path).toMatchObject({ kind: 'next' })
    }
  })
})
