/**
 * The first-party beacon (ANALYTICS.md §3; TASKS.md 9.2.a): `track(name, props)` queues an event,
 * the queue drains to `POST /api/x/collect` with `navigator.sendBeacon` at most once per 5 seconds
 * per tab, and a flush happens on `visibilitychange` when the tab hides. Fire-and-forget: a failed
 * post never breaks a page, and nothing here throws. Cookieless — no cookie is set or read, no
 * localStorage id, nothing stored on the device; the page sends only what its own view knows (the
 * name, its props, `at`, `locale`, the page URL and the referrer), and collect stamps the rest.
 */

const COLLECT_PATH = '/api/x/collect'
/** Send at most once per 5 s per tab (§3): the drain's minimum spacing. */
const FLUSH_EVERY_MS = 5000
/** Collect's batch limit (§3) — the queue never offers it more than it accepts. */
const MAX_BATCH = 20

export type QueuedEvent = {
  name: string
  props: Record<string, unknown>
  at: string
  locale: string | null
  url: string
  referrer: string | null
  surface: string | null
  /** The landing URL's `utm_*`, captured once — the envelope's, never inside `props`. */
  utm: Record<string, string>
}

type Queue = {
  events: QueuedEvent[]
  timer: ReturnType<typeof setTimeout> | null
}

let queue: Queue | null = null

/** The landing URL's `utm_*` parameters, captured once, in memory only — never a cookie. */
const landingUtm: Record<string, string> = {}
try {
  if (typeof location !== 'undefined') {
    for (const [key, value] of new URLSearchParams(location.search)) {
      if (/^utm_[a-z]+$/i.test(key)) landingUtm[key] = value.slice(0, 120)
    }
  }
} catch {
  // No location (a script imported outside a browser): tracking just stays off.
}

function newEvent(name: string, props: Record<string, unknown>): QueuedEvent | null {
  try {
    if (typeof location === 'undefined') return null
    return {
      name,
      props,
      at: new Date().toISOString(),
      locale: typeof document !== 'undefined' ? document.documentElement.lang || null : null,
      url: location.href,
      referrer:
        typeof document !== 'undefined' && document.referrer !== '' ? document.referrer : null,
      surface:
        typeof document !== 'undefined' ? (document.documentElement.dataset.surface ?? null) : null,
      utm: { ...landingUtm },
    }
  } catch {
    return null
  }
}

/** Queues one event. Never throws; tracking that fails stays silent. */
export function track(name: string, props: Record<string, unknown> = {}): void {
  try {
    const event = newEvent(name, props)
    if (event === null) return
    if (queue === null) {
      queue = { events: [], timer: null }
      try {
        document.addEventListener('visibilitychange', onVisibilityChange)
      } catch {
        // No document: the timer still drains the queue.
      }
    }
    if (queue.events.length < MAX_BATCH * 4) queue.events.push(event)
    if (queue.timer === null) {
      queue.timer = setTimeout(drain, FLUSH_EVERY_MS)
    }
  } catch {
    // Fire-and-forget: nothing a beacon does may break a page.
  }
}

function onVisibilityChange(): void {
  try {
    if (document.visibilityState === 'hidden') drain()
  } catch {
    // See `track`: never throws.
  }
}

/** Sends up to a batch of queued events now; safe to call at any moment, from anywhere. */
export function drain(): void {
  try {
    if (queue === null || queue.events.length === 0) {
      if (queue !== null && queue.timer !== null) {
        clearTimeout(queue.timer)
        queue.timer = null
      }
      return
    }
    const batch = queue.events.splice(0, MAX_BATCH).map(({ surface: _surface, ...event }) => event)
    if (queue.timer === null) queue.timer = setTimeout(drain, FLUSH_EVERY_MS)
    const body = JSON.stringify({ events: batch })
    const blob = new Blob([body], { type: 'application/json' })
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      if (navigator.sendBeacon(COLLECT_PATH, blob)) return
    }
    void fetch(COLLECT_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // A failed post is dropped, never retried into a loop: the next drain sends what is queued.
    })
  } catch {
    // See `track`: never throws.
  }
}

/** The tests' reset: clears the queue and the timer, and the landing utm capture. */
export function resetBeacon(): void {
  try {
    if (queue !== null && queue.timer !== null) clearTimeout(queue.timer)
    queue = null
  } catch {
    // As everywhere in this module.
  }
}
