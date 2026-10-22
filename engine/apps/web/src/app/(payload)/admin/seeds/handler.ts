/**
 * `GET`/`POST /api/x/seed` (`src/app/api/x/seed/route.ts`): the seed screen's requests. Owner
 * only, read from the session (`payload.auth()`, which holds the cookie to Payload's trusted
 * origins), never from the body; JSON in (a cross-site form cannot send it), JSON out, never
 * cached. Refused in production (`./runner`). The body names the action and nothing else.
 */
import 'server-only'

import { after } from 'next/server'

import { cms } from '@engine/cms/instance'

import { isSeedAction, seedState, seedsAllowed, startSeed } from './runner'

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

async function isOwner(request: Request): Promise<boolean> {
  const payload = await cms()
  const { user } = await payload.auth({ headers: request.headers })
  return (user as { role?: unknown } | null)?.role === 'owner'
}

export async function getSeed(request: Request): Promise<Response> {
  if (!(await isOwner(request))) return json(403, { ok: false, code: 'not_allowed' })
  return json(200, { ok: true, allowed: seedsAllowed(), state: seedState() })
}

export async function postSeed(request: Request): Promise<Response> {
  if (!(request.headers.get('content-type') ?? '').startsWith('application/json')) {
    return json(415, { ok: false, code: 'bad_request' })
  }
  if (Number(request.headers.get('content-length') ?? '0') > 256) {
    return json(413, { ok: false, code: 'bad_request' })
  }
  if (!(await isOwner(request))) return json(403, { ok: false, code: 'not_allowed' })
  if (!seedsAllowed()) return json(403, { ok: false, code: 'production' })
  let action: unknown
  try {
    const body = (await request.json()) as { action?: unknown }
    action = body?.action
  } catch {
    return json(400, { ok: false, code: 'bad_request' })
  }
  if (!isSeedAction(action)) return json(400, { ok: false, code: 'bad_request' })
  const started = startSeed(action, await cms())
  if (started === null) return json(409, { ok: false, code: 'busy', state: seedState() })
  // The run outlives this response; the screen asks for its state with GET until it ends.
  after(() => started.run)
  return json(202, { ok: true, state: started.state })
}
