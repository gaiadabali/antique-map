// `POST /api/x/leads` (5.3.c): the gallery's lead forms' mount. The handler does the work;
// this file resolves the process's dependencies on its first request and answers a failure the
// handler did not expect with a plain 503 — never a stack, a key or the request body.
import { leadDeps } from '../../../../server/leads/deps'

import { handleLeadPost } from './handler'
import { LeadIdempotency } from './idempotency'

const idempotency = new LeadIdempotency()

export async function POST(request: Request): Promise<Response> {
  try {
    return await handleLeadPost(request, await leadDeps(), idempotency)
  } catch (error) {
    console.error(
      `[leads] ${new URL(request.url).pathname} failed: ${error instanceof Error ? error.name : 'error'}`,
    )
    return new Response(JSON.stringify({ error: 'unavailable' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    })
  }
}
