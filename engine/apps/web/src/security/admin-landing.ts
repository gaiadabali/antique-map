/**
 * Store staff's admin home is their Order panel (TASKS.md 16.2). The Catalogue Wall redirects a
 * store user itself, but by then Payload has begun streaming the page, so Next can only answer 200
 * with a one-second refresh: a phone shows an in-between page first (staging, 2026-10-11). Here,
 * before anything renders, a GET of `/admin` whose session names the store role is answered 307 to
 * `/admin/orders`.
 *
 * The session's claims are read, not verified. The redirect grants nothing — the panel applies its
 * own access — so a forged claim only moves its sender to a page that judges them anyway. The
 * cookie's name is the cms config's `COOKIE_PREFIX` and `-token`, copied rather than imported: the
 * proxy never loads the cms package (eslint boundary 1).
 */

export const SESSION_COOKIE = 'payload-token'
export const STORE_HOME = '/admin/orders'
const ADMIN_HOME = new Set(['/admin', '/admin/'])

/** One cookie's value from a `Cookie` header, or null. */
function cookieValue(header: string | null, name: string): string | null {
  if (!header) return null
  for (const pair of header.split(';')) {
    const [key, ...rest] = pair.trim().split('=')
    if (key === name) {
      try {
        return decodeURIComponent(rest.join('='))
      } catch {
        return null
      }
    }
  }
  return null
}

/** A JWT's claims, unverified, or null when it is not one. */
function claimsOf(token: string): Record<string, unknown> | null {
  const part = token.split('.')[1]
  if (!part) return null
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
    const value: unknown = JSON.parse(json)
    return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** The 307 to the Order panel for a store user opening the admin's home, else null. */
export function storeLandingRedirect(request: Request): Response | null {
  if (request.method !== 'GET') return null
  if (!ADMIN_HOME.has(new URL(request.url).pathname)) return null
  const token = cookieValue(request.headers.get('cookie'), SESSION_COOKIE)
  if (token === null || claimsOf(token)?.role !== 'store') return null
  return new Response(null, {
    status: 307,
    headers: { Location: STORE_HOME, 'Cache-Control': 'no-store' },
  })
}

/** The proxy with the store users' landing in front of it. */
export function withStoreLanding(
  inner: (request: Request) => Response,
): (request: Request) => Response {
  return (request) => storeLandingRedirect(request) ?? inner(request)
}
