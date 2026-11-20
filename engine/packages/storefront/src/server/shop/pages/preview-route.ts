/**
 * `GET /api/x/preview?path=/{page}` — the admin's Live Preview frame enters a shop page's draft
 * here (TASKS.md 27.5.a); `?exit=1` leaves draft mode.
 *
 * Draft mode (Next's `__prerender_bypass` cookie) is switched on only for a signed-in owner or
 * editor: the Payload session is verified from the request's own cookies (`payload.auth`), on the
 * shop's host — the admin's (`ADMIN_HOST`), where staff cookies live — and never for a request
 * another site started (a browser's `Sec-Fetch-Site`), so no other site can switch a staff
 * member's browser into preview. There is no token in the URL to guess or leak. The cookie alone shows no draft
 * either: every draft read re-verifies the session (`server/shop/pages/preview`). The page it
 * sends to is a shop page's own path (`./path`), never an address from elsewhere.
 */
import { draftMode } from 'next/headers'

import { PROXY_REQUEST_HEADERS } from '@engine/http/manifest'

import { catalogueStaffOf } from './preview'
import { previewPath, returnPath } from './preview-path'

const NO_STORE = { 'cache-control': 'no-store' }

function refuse(status: number, code: string): Response {
  return new Response(JSON.stringify({ ok: false, code }), {
    status,
    headers: { 'content-type': 'application/json', ...NO_STORE },
  })
}

function goTo(path: string): Response {
  return new Response(null, { status: 307, headers: { location: path, ...NO_STORE } })
}

export async function GET(request: Request): Promise<Response> {
  if (request.headers.get(PROXY_REQUEST_HEADERS.site) !== 'shop') return refuse(404, 'not_found')
  const url = new URL(request.url)
  const draft = await draftMode()
  if (url.searchParams.get('exit') === '1') {
    draft.disable()
    return goTo(returnPath(url.searchParams.get('path')))
  }
  // Another site (or a sibling subdomain) may not switch preview on; the admin's frame and its
  // "open in a new window" are same-origin, and an address typed by the person is `none`.
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite === 'cross-site' || fetchSite === 'same-site') return refuse(403, 'not_allowed')
  const path = previewPath(url.searchParams.get('path'))
  if (path === null) return refuse(400, 'bad_path')
  try {
    if ((await catalogueStaffOf(request.headers)) === null) return refuse(403, 'not_allowed')
  } catch (error) {
    console.error(`[preview] failed: ${error instanceof Error ? error.name : 'error'}`)
    return refuse(503, 'unavailable')
  }
  draft.enable()
  return goTo(path)
}
