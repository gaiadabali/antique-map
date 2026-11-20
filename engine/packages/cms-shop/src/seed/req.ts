/**
 * A request for the seed's Local API writes — the importer's own request idiom (`../import/apply`
 * keeps its private twin, which stays private): a script's request has no user, and Payload keeps
 * a request's locale state, so every write builds a fresh one. `context` is the caller's cache
 * collector context (`@engine/cache` batch), which the cache hooks read on `req.context`: a script
 * runs outside any Next request, so a hook with no collector would throw.
 */
import type { Payload, PayloadRequest, RequestContext } from 'payload'

export function reqOf(
  payload: Payload,
  locale: 'en' | 'all' | 'id' = 'en',
  context?: RequestContext,
): PayloadRequest {
  return {
    payload,
    user: null,
    locale,
    headers: new Headers(),
    t: (key: string) => key,
    ...(context ? { context } : {}),
  } as unknown as PayloadRequest
}
