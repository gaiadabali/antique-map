// `POST /api/x/draft` (8.3.a): the CMS's "Draft from photographs" button. The admin's server
// half (`(payload)/admin/ai/handler`) does the work — who asks, from the session; the limits; the
// model; the write. This file answers a failure it did not expect with a plain 503 — never a
// stack, a key or the request body.
import { postDraft } from '../../../(payload)/admin/ai/handler'

export async function POST(request: Request): Promise<Response> {
  try {
    return await postDraft(request)
  } catch (error) {
    console.error(`[draft] failed: ${error instanceof Error ? error.name : 'error'}`)
    return new Response(JSON.stringify({ ok: false, code: 'unavailable' }), {
      status: 503,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    })
  }
}
