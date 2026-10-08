/**
 * Per-address rate limits for the routes SECURITY.md §2.10 names and nothing limits today
 * (finding F-02): sign-in, forgot and reset password, checkout. The same kind of limiter the app
 * already has for tracking, leads and the geocoder — in-process while there is one process, a
 * fixed window per key, answering 429 with `Retry-After` — in one place, with the table.
 *
 * Keyed on the address nginx appends to `X-Forwarded-For` (the last entry; the app binds
 * loopback, so a direct hit cannot forge it) — the rule `@engine/http/proxy`'s `clientAddress`
 * follows, restated here because that module keeps it private.
 *
 * Wiring (the platform lane owns the proxy): in `proxy.ts`, wrap `createProxy`'s answer,
 *
 *   const limiter = limitFor(request.method, new URL(request.url).pathname)
 *   const wait = limiter?.hit(clientAddress(request.headers)) ?? 0
 *   if (wait > 0) return limited(wait)
 *
 * Checkout is a server action, not a path: the order-creating action calls
 * `limiters.checkout.hit(address)` and answers its own 429 text when the wait is above 0.
 */
export type Limit = { readonly name: string; readonly max: number; readonly windowMs: number }

/** §2.10's table, per IP. */
export const LIMITS = {
  signIn: { name: 'sign-in', max: 10, windowMs: 15 * 60_000 },
  passwordReset: { name: 'forgot-reset-password', max: 3, windowMs: 60 * 60_000 },
  checkout: { name: 'checkout', max: 10, windowMs: 60 * 60_000 },
} as const satisfies Record<string, Limit>

const SWEEP_AT = 5_000

type Window = { start: number; count: number }

/** A fixed window per key; entries older than a window are swept as the map grows. */
export class RateLimiter {
  private readonly windows = new Map<string, Window>()

  constructor(readonly limit: Limit) {}

  /**
   * Counts a request from `key`. Returns 0 when it fits, else the whole seconds until the key's
   * window ends (the `Retry-After`).
   */
  hit(key: string, now: number = Date.now()): number {
    if (this.windows.size >= SWEEP_AT) this.sweep(now)
    const window = this.windows.get(key)
    if (window === undefined || now - window.start >= this.limit.windowMs) {
      this.windows.set(key, { start: now, count: 1 })
      return 0
    }
    if (window.count >= this.limit.max) {
      return Math.max(1, Math.ceil((window.start + this.limit.windowMs - now) / 1000))
    }
    window.count += 1
    return 0
  }

  sweep(now: number = Date.now()): void {
    for (const [key, window] of this.windows) {
      if (now - window.start >= this.limit.windowMs) this.windows.delete(key)
    }
  }

  reset(): void {
    this.windows.clear()
  }
}

export const limiters = {
  signIn: new RateLimiter(LIMITS.signIn),
  passwordReset: new RateLimiter(LIMITS.passwordReset),
  checkout: new RateLimiter(LIMITS.checkout),
}

/** The limiter a request counts against, by method and path; null for any other request. */
export function limitFor(method: string, pathname: string): RateLimiter | null {
  if (method.toUpperCase() !== 'POST') return null
  if (pathname === '/api/users/login') return limiters.signIn
  if (pathname === '/api/users/forgot-password' || pathname === '/api/users/reset-password') {
    return limiters.passwordReset
  }
  return null
}

/** The address nginx appended to `X-Forwarded-For`, or `unknown` off that reverse proxy. */
export function clientAddress(headers: Headers): string {
  const last = headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
  return last && /^[0-9a-f:.]{2,45}$/i.test(last) ? last : 'unknown'
}

/** The 429 to send for a wait of `seconds`. */
export function limited(seconds: number): Response {
  return new Response('Too many requests', {
    status: 429,
    headers: {
      'Retry-After': String(seconds),
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
