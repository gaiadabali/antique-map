/**
 * The proxy with the per-address limits of SECURITY.md §2.10 in front of it (finding F-02): a POST
 * to sign-in, forgot password or reset password is counted against the caller's address before the
 * proxy decides anything, and the next one past the limit is answered 429 with `Retry-After`.
 *
 * A request with no usable `X-Forwarded-For` (a workstation or CI, off the nginx that appends the
 * real address; the app binds loopback in production, so a client cannot strip it) is not counted:
 * one shared "unknown" bucket would lock every local sign-in out after ten.
 */
import { clientAddress, limited, limitFor, limiters, type RateLimiter } from './rate-limit'

/** Counts a request against `limiter`: the seconds to wait, 0 when it fits or has no address. */
function hitBy(limiter: RateLimiter, headers: Headers): number {
  const address = clientAddress(headers)
  return address === 'unknown' ? 0 : limiter.hit(address)
}

/**
 * The order-creating checkout action's limit (F-02): the seconds the caller must wait, or 0. The
 * action is not a path, so the proxy cannot see it; it asks here and answers its own refusal.
 */
export function checkoutWait(headers: Headers): number {
  return hitBy(limiters.checkout, headers)
}

export function withRateLimits(
  inner: (request: Request) => Response,
): (request: Request) => Response {
  return (request) => {
    const limiter = limitFor(request.method, new URL(request.url).pathname)
    if (limiter !== null) {
      const wait = hitBy(limiter, request.headers)
      if (wait > 0) return limited(wait)
    }
    return inner(request)
  }
}
