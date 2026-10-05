/**
 * A request for the seed's Local API writes — the importer's own request idiom (`../import/apply`
 * keeps its private twin, which stays private): a script's request has no user, and Payload keeps
 * a request's locale state, so every write builds a fresh one.
 */
import type { Payload, PayloadRequest } from 'payload'

export function reqOf(payload: Payload, locale: 'en' | 'all' | 'id' = 'en'): PayloadRequest {
  return {
    payload,
    user: null,
    locale,
    headers: new Headers(),
    t: (key: string) => key,
  } as unknown as PayloadRequest
}
