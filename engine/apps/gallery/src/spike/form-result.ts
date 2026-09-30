/**
 * A post's outcome, the way C13 `FORM_RESULT` keeps it: on the server under an opaque id, the
 * browser holding only that id in an `HttpOnly` cookie for at most ten minutes, and gone once the
 * page has shown it. The page reads it at request time and renders it in its own body — never
 * inside a `<Suspense>`, where a visitor without JavaScript would never see it.
 */
import { randomUUID } from 'node:crypto'

import { cookies, headers } from 'next/headers'

import { readState, writeState } from './store'

export const FORM_RESULT_COOKIE = 'spike-form-result'
const TEN_MINUTES = 600

/** In a Server Action: keep `code` and hand the browser its id. */
export async function keepFormResult(code: string): Promise<void> {
  const id = randomUUID()
  writeState((state) => ({
    ...state,
    results: { ...state.results, [id]: { text: code, at: Date.now() } },
  }))
  ;(await cookies()).set(FORM_RESULT_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: (process.env.SITE_URL ?? '').startsWith('https:'),
    path: '/',
    maxAge: TEN_MINUTES,
  })
}

/**
 * A request the visitor is not looking at yet: a router prefetch — which renders the page in full
 * here (`htmlLimitedBots`, ARCHITECTURE.md §9) — or a speculation rule's. Next strips its own router
 * headers (`RSC`, `Next-Router-Prefetch` …) before the render, so the page reads the browser's:
 * the router's `fetch()` is `Sec-Fetch-Dest: empty`, a navigation `document`, and a speculative
 * load says `Sec-Purpose: prefetch`. A client without Fetch Metadata is taken as a document load.
 */
function isAhead(headers: Headers): boolean {
  const dest = headers.get('sec-fetch-dest')
  const purpose = headers.get('sec-purpose') ?? headers.get('purpose') ?? ''
  return (dest !== null && dest !== 'document') || /prefetch/i.test(purpose)
}

/**
 * In a render: the outcome this visitor posted, once — the entry is deleted as it is shown, but
 * never by a prefetch, which would take it before the visitor's own request (senior-fe #4; the
 * carrier C13 `FORM_RESULT` settles on is ARC's, 4.3). A prefetch sees it and leaves it.
 */
export async function takeFormResult(): Promise<string | null> {
  const id = (await cookies()).get(FORM_RESULT_COOKIE)?.value
  if (!id) return null
  const entry = readState().results[id]
  if (!entry || Date.now() - entry.at > TEN_MINUTES * 1000) return null
  if (isAhead(await headers())) return entry.text
  writeState((state) => {
    const { [id]: _shown, ...rest } = state.results
    return { ...state, results: rest }
  })
  return entry.text
}
