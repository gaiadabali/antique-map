/**
 * `POST /api/x/draft` `{ workId }` (TASKS.md 8.3.a): the admin button's request. Who asks is read
 * from the session — the request's cookie or token, through `payload.auth()`, which also holds a
 * cookie to Payload's trusted origins (`access/origins`) — never from the body; the body names
 * the work and nothing else. JSON in (a cross-site form cannot send it), JSON out, never cached.
 * The answer is a code the admin turns into words (`./copy`), never a model's text or a stack.
 */
import { draftWork, type DraftDeps, type DraftRefusal } from './draft'

const MAX_BODY_CHARS = 1024

const STATUS: Record<DraftRefusal | 'bad_request', number> = {
  bad_request: 400,
  not_signed_in: 401,
  not_allowed: 403,
  not_found: 404,
  busy: 409,
  no_photographs: 422,
  model_refused: 422,
  unusable_reply: 422,
  not_saved: 422,
  rate_limited: 429,
  model_failed: 502,
  disabled: 503,
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
  })
}

/** The work's id from the body: a positive integer, as a number or its digits. */
export function workIdOf(raw: string): number | null {
  if (raw.length > MAX_BODY_CHARS) return null
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return null
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return null
  const keys = Object.keys(body)
  if (keys.length !== 1 || keys[0] !== 'workId') return null
  const value = (body as { workId: unknown }).workId
  const id = typeof value === 'string' && /^\d{1,12}$/.test(value) ? Number(value) : value
  return typeof id === 'number' && Number.isSafeInteger(id) && id > 0 ? id : null
}

export async function handleDraftPost(request: Request, deps: DraftDeps): Promise<Response> {
  const type = request.headers.get('content-type') ?? ''
  if (!/^application\/json\b/i.test(type)) return json(415, { ok: false, code: 'bad_request' })
  const workId = workIdOf(await request.text())
  if (workId === null) return json(STATUS.bad_request, { ok: false, code: 'bad_request' })
  const { user } = await deps.payload.auth({ headers: request.headers })
  const result = await draftWork(deps, { user, workId })
  if (result.ok) return json(200, result)
  const headers: Record<string, string> =
    result.retryAfter === undefined ? {} : { 'retry-after': String(result.retryAfter) }
  return json(STATUS[result.code], result, headers)
}
