/**
 * A post's outcome, the way C13 `FORM_RESULT` keeps it: on the server under an opaque id, the
 * browser holding only that id in an `HttpOnly` cookie for at most ten minutes, and gone once the
 * page has shown it. The page reads it at request time and renders it in its own body — never
 * inside a `<Suspense>`, where a visitor without JavaScript would never see it.
 */
import { randomUUID } from 'node:crypto'

import { cookies } from 'next/headers'

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

/** In a render: the outcome this visitor posted, once — the entry is deleted as it is shown. */
export async function takeFormResult(): Promise<string | null> {
  const id = (await cookies()).get(FORM_RESULT_COOKIE)?.value
  if (!id) return null
  const entry = readState().results[id]
  if (!entry || Date.now() - entry.at > TEN_MINUTES * 1000) return null
  writeState((state) => {
    const { [id]: _shown, ...rest } = state.results
    return { ...state, results: rest }
  })
  return entry.text
}
