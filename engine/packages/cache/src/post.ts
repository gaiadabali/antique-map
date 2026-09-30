/**
 * How a flushed collector reaches the process that holds the cache (C13 `REVALIDATE_REQUEST`,
 * ARCHITECTURE.md §9): `POST /api/x/revalidate` on this brand's origin, with
 * `Authorization: Bearer <REVALIDATE_SECRET>` and a JSON body `{ "tags": [...] }` of at most
 * `maxTags` tags within `maxBodyBytes`. The route (WEB, TASKS.md 4.6.f) checks each tag against
 * `parseCacheTag()`, expires it at its kind's profile — never one the body names — and answers
 * 204; anything else is a failure, thrown, so an outbox retries it (design.md, "Cache").
 */
import type { CacheTag } from './tags'

/**
 * C13's `REVALIDATE_REQUEST` and the route's path, restated: this leaf cannot import
 * `@engine/http` (which reaches cms, which imports this), so a test reads the manifest's source
 * and fails when the two differ.
 */
export const REVALIDATE_ROUTE = Object.freeze({
  path: '/api/x/revalidate',
  maxTags: 256,
  maxBodyBytes: 64 * 1024,
})

/** Where a flush posts: the brand's origin and the bearer secret the route compares. */
export type RevalidateTarget = { readonly origin: string; readonly secret: string }

type Env = Readonly<Record<string, string | undefined>>

/**
 * The target from the process's environment: `SITE_URL` (the origin this brand serves,
 * DEPLOYMENT.md §8) and `REVALIDATE_SECRET`. Throws naming what is missing, never a value — a
 * worker that cannot post must fail, not skip its invalidation.
 */
export function revalidateTargetFrom(env: Env = process.env): RevalidateTarget {
  const site = env.SITE_URL?.trim()
  const secret = env.REVALIDATE_SECRET?.trim()
  const missing = [site ? null : 'SITE_URL', secret ? null : 'REVALIDATE_SECRET'].filter(Boolean)
  if (missing.length > 0) {
    throw new Error(
      `invalidate(): cannot post to ${REVALIDATE_ROUTE.path}: ${missing.join(', ')} unset`,
    )
  }
  let origin: URL
  try {
    origin = new URL(site!)
  } catch {
    throw new Error(`invalidate(): SITE_URL is not a URL, so there is nowhere to post`)
  }
  if (origin.protocol !== 'https:' && origin.protocol !== 'http:') {
    throw new Error(`invalidate(): SITE_URL is not an http(s) origin`)
  }
  return { origin: origin.origin, secret: secret! }
}

const bodyOf = (tags: readonly string[]) => JSON.stringify({ tags })
/** `{"tags":[` and `]}`: a body's bytes besides its tags and their commas. */
const BODY_FRAME_BYTES = bodyOf([]).length
/** A tag's bytes in a body: the grammar's tags are ASCII, so one character is one byte. */
const tagBytes = (tag: string) => JSON.stringify(tag).length

/** `tags` in bodies the route accepts: at most `maxTags` each, within `maxBodyBytes`. */
export function revalidateBodies(tags: readonly CacheTag[]): string[][] {
  const bodies: string[][] = []
  let current: string[] = []
  let bytes = BODY_FRAME_BYTES
  for (const tag of tags) {
    // A comma before every tag but a body's first.
    const full =
      current.length === REVALIDATE_ROUTE.maxTags ||
      bytes + 1 + tagBytes(tag) > REVALIDATE_ROUTE.maxBodyBytes
    if (current.length > 0 && full) {
      bodies.push(current)
      current = []
      bytes = BODY_FRAME_BYTES
    }
    bytes += tagBytes(tag) + (current.length > 0 ? 1 : 0)
    current.push(tag)
  }
  if (current.length > 0) bodies.push(current)
  return bodies
}

/** How long one post may take before it counts as failed. */
export const REVALIDATE_TIMEOUT_MS = 10_000

export type PostOptions = { readonly fetch?: typeof fetch }

/**
 * Posts `tags` in order, one body at a time, each awaited to its 204. Resolves with how many
 * were accepted; on the first failure it rejects with the error and `accepted` — how many tags,
 * from the front, had been accepted by then — so a caller keeps the rest.
 */
export async function postTags(
  target: RevalidateTarget,
  tags: readonly CacheTag[],
  options: PostOptions = {},
): Promise<number> {
  const send = options.fetch ?? fetch
  const url = new URL(REVALIDATE_ROUTE.path, target.origin)
  let accepted = 0
  for (const body of revalidateBodies(tags)) {
    let response: Response
    try {
      response = await send(url, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${target.secret}`,
          'content-type': 'application/json',
        },
        body: bodyOf(body),
        // A redirect would carry the bearer somewhere else; the route never answers one.
        redirect: 'error',
        signal: AbortSignal.timeout(REVALIDATE_TIMEOUT_MS),
      })
    } catch (cause) {
      throw new RevalidatePostError(`POST ${url.pathname} failed: ${String(cause)}`, accepted)
    }
    if (response.status !== 204) {
      const text = (await response.text().catch(() => '')).slice(0, 200)
      throw new RevalidatePostError(
        `POST ${url.pathname} answered ${response.status}${text ? `: ${text}` : ''}`,
        accepted,
      )
    }
    accepted += body.length
  }
  return accepted
}

export class RevalidatePostError extends Error {
  constructor(
    message: string,
    /** How many tags, from the front, the route had accepted before this failure. */
    readonly accepted: number,
  ) {
    super(`invalidate(): ${message}`)
    this.name = 'RevalidatePostError'
  }
}
