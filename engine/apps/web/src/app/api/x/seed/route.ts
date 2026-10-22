// `GET`/`POST /api/x/seed`: the admin's seed screen (`/admin/seeds`). The admin's server half
// (`(payload)/admin/seeds/handler`) does the work — who asks, from the session; production refused;
// one run at a time. A failure it did not expect is a plain 503, never a stack.
import { getSeed, postSeed } from '../../../(payload)/admin/seeds/handler'

function unavailable(error: unknown): Response {
  console.error(`[seed] failed: ${error instanceof Error ? error.name : 'error'}`)
  return new Response(JSON.stringify({ ok: false, code: 'unavailable' }), {
    status: 503,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

export async function GET(request: Request): Promise<Response> {
  try {
    return await getSeed(request)
  } catch (error) {
    return unavailable(error)
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    return await postSeed(request)
  } catch (error) {
    return unavailable(error)
  }
}
