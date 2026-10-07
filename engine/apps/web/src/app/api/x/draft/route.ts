// `POST /api/x/draft` (8.3.a): the CMS's "Draft from photographs" button. `@engine/cms/ai`
// `handleDraftPost` does the work — who asks, from the session; the limits; the model; the write;
// this file resolves the process's dependencies on its first request and answers a failure the
// handler did not expect with a plain 503 — never a stack, a key or the request body.
import { handleDraftPost } from '@engine/cms/ai'

import { draftDeps } from './deps'

export async function POST(request: Request): Promise<Response> {
  try {
    return await handleDraftPost(request, await draftDeps())
  } catch (error) {
    console.error(`[draft] failed: ${error instanceof Error ? error.name : 'error'}`)
    return new Response(JSON.stringify({ ok: false, code: 'unavailable' }), {
      status: 503,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    })
  }
}
