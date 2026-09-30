/**
 * The plain answers every WEB handler in this package shares (senior-be #16: one of each). They
 * live beside the legacy stub, the first handler that needed them, until `@engine/http` has a
 * shared module of its own (its package exports only `./manifest` and `./<area>` routes).
 */

/** A plain-text answer that no cache keeps and no browser sniffs. */
export function plain(
  status: number,
  text: string,
  headers: Record<string, string> = {},
): Response {
  return new Response(text, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  })
}

/** A plain, uncached 404: no page, no loader, nothing a later deploy must invalidate. */
export function notFound(): Response {
  return plain(404, 'Not found')
}

/**
 * Marks a `GET` as request-time. Under Cache Components a route handler that never reads its
 * request is prerendered: `next build` runs it once and bakes the answer in (the 4.1.e spike saw
 * `/api/health`'s boot check run at build). Next's `connection()` says the same, but this package
 * does not depend on `next`; reading the request is the documented equivalent ("request object
 * properties … stop prerendering"). Call it first, before anything the build must never do.
 */
export function atRequestTime(request: Request): void {
  void request.headers.get('host')
}
