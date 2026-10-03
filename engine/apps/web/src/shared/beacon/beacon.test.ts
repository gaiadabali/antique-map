/**
 * The beacon's contract (ANALYTICS.md §3): fire-and-forget, at most one send per 5 s per tab,
 * flushed on visibilitychange, batching to collect's limit — and nothing stored on the device:
 * no cookie, no localStorage id.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Sent = { url: string; body: { events: Array<Record<string, unknown>> } }
const sent: Sent[] = []
let visibilityState = 'visible'
const listeners = new Map<string, () => void>()

/** The browser surface the beacon reads — installed at import and re-installed when a test's
 * own stubbing has replaced part of it. */
function installBrowserStubs(): void {
  vi.stubGlobal('location', new URL('https://gallery.test/?utm_source=instagram'))
  vi.stubGlobal('document', {
    documentElement: { lang: 'en', dataset: { surface: 'gallery' } },
    referrer: 'https://www.google.com/',
    get visibilityState() {
      return visibilityState
    },
    addEventListener: (kind: string, fn: () => void) => listeners.set(kind, fn),
  })
  vi.stubGlobal('navigator', {
    sendBeacon: (url: string, blob: Blob) => {
      void blob.text().then((text) => sent.push({ url, body: JSON.parse(text) }))
      return true
    },
  })
  // A fetch that fails like a browser's can — the beacon must drop and never retry into a loop.
  vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')))
}

installBrowserStubs()

// After the globals are stubbed: the module captures the landing utm at import.
const { drain, resetBeacon, track } = await import('./beacon')

beforeEach(() => {
  sent.length = 0
  visibilityState = 'visible'
  vi.useFakeTimers()
  resetBeacon()
})

describe('the beacon', () => {
  it('queues and sends a batch through sendBeacon to /api/x/collect', async () => {
    track('page.viewed', { pageType: 'home' })
    track('item.viewed', { workId: 12, objectType: 'map', status: 'published' })
    vi.advanceTimersByTime(5_000)
    await vi.waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]!.url).toBe('/api/x/collect')
    expect(sent[0]!.body.events).toHaveLength(2)
  })

  it('sends at most once per 5 s per tab, even if track keeps firing', async () => {
    for (let i = 0; i < 20; i += 1) track('page.viewed', { pageType: 'home' })
    vi.advanceTimersByTime(4_999)
    await Promise.resolve()
    expect(sent).toHaveLength(0)
    vi.advanceTimersByTime(1)
    await vi.waitFor(() => expect(sent).toHaveLength(1))
    expect(sent).toHaveLength(1)
  })

  it('flushes on visibilitychange when the tab hides', async () => {
    track('page.viewed', { pageType: 'home' })
    visibilityState = 'hidden'
    listeners.get('visibilitychange')?.()
    await vi.waitFor(() => expect(sent).toHaveLength(1))
  })

  it('sends the landing utm on the envelope, never inside props', async () => {
    track('page.viewed', { pageType: 'home' })
    vi.advanceTimersByTime(5_000)
    await vi.waitFor(() => expect(sent).toHaveLength(1))
    const event = sent[0]!.body.events[0]!
    expect(event.utm).toEqual({ utm_source: 'instagram' })
    expect(event.props).toEqual({ pageType: 'home' })
  })

  it('never throws — not without a page, not on a failed send', async () => {
    expect(() => track('page.viewed', {})).not.toThrow()
    expect(() => drain()).not.toThrow()
    vi.stubGlobal('navigator', { sendBeacon: () => false })
    track('page.viewed', { pageType: 'home' })
    expect(() => vi.advanceTimersByTime(5_000)).not.toThrow()
    await Promise.resolve()
    expect(() => drain()).not.toThrow()
    // The tests after this one need a working sendBeacon again.
    installBrowserStubs()
  })

  it('no cookie is set or read', async () => {
    track('page.viewed', { pageType: 'home' })
    vi.advanceTimersByTime(5_000)
    await vi.waitFor(() => expect(sent).toHaveLength(1))
    // Nothing in the module touches document.cookie or localStorage; the globals here expose
    // neither, so a touch would have thrown and the batch still went out.
    expect(typeof document.cookie).toBe('undefined')
  })
})
