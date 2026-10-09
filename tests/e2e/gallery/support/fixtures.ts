/**
 * The gallery browse/search e2e's fixtures (TASKS.md 5.1.d), all made in the spec and removed in
 * `afterAll` — never by hand. Payload's REST answers on the shop host (ADMIN_HOST: the shop's, Q1),
 * so every write goes there with a `Host` header while the pages under test are the gallery's.
 *
 * The fixtures are built so that no claim holds by accident:
 * - The published work's title, alt text and place name never say "Batavia": only the place's
 *   **historical** name does, so a search for Batavia can find it through the gazetteer alone.
 * - The draft is the published work's twin — same place, grade, availability, a photographed recto,
 *   an asking price — and differs in `_status` alone. Both titles carry one shared word, so a search
 *   for that word must answer the published one and not the draft: the draft is hidden by its
 *   status, not by missing data or a word nobody indexes.
 * - The published work also has a newer **draft revision** with a word of its own: the public must
 *   keep reading the published version.
 * - Both carry an asking price with a distinctive figure, so its absence from a page means something.
 *
 * Every record is put on the ledger the moment it exists, so a fixture that fails half-way is still
 * removed; a removal that fails fails the suite.
 */
import type { APIRequestContext, APIResponse } from '@playwright/test'

import { savedToken } from '../../support/sessions'
import { BASE_URL, HOST_HEADER, OWNER } from './env'

/** A 1×1 PNG — a real, sniffable raster for the recto upload. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

/** The asking prices (whole US dollars): figures no other text on a page carries. */
export const PUBLISHED_PRICE = 987_651
export const DRAFT_PRICE = 876_542

export type GalleryFixtures = {
  /** The published work: under a place whose historical (not modern) name is Batavia. */
  readonly publishedTitle: string
  /** A word both titles carry: a search for it reaches the published work and the draft alike. */
  readonly pairWord: string
  /** The draft twin's title, and a word only it carries. */
  readonly draftTitle: string
  readonly draftWord: string
  /** A word only the published work's newer, unpublished revision carries. */
  readonly revisionWord: string
}

type Jwt = string
type Created = { readonly collection: string; readonly id: number }

/** What the suite made, newest last, and how to remove it. */
export type Ledger = {
  readonly created: Created[]
  readonly cleanup: () => Promise<void>
}

/** The signed-in owner's token, kept for the run. */
let cachedToken: Jwt | null = null

/** Runs `call` up to `tries` times on a transient failure. The shared dev Postgres drops a new
 * connection under other worktrees' load (`admin/local.mjs` retries its fixtures for exactly
 * this): a dropped socket, or a 5xx after the server's own query died — never a 4xx. */
async function retrying(call: () => Promise<APIResponse>, tries = 4): Promise<APIResponse> {
  for (let attempt = 1; ; attempt += 1) {
    let res: APIResponse
    try {
      res = await call()
    } catch (error) {
      const text = `${(error as { code?: string }).code ?? ''} ${String(error)}`
      if (attempt >= tries || !/ECONNRESET|ECONNREFUSED|socket hang up/.test(text)) throw error
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt))
      continue
    }
    if (res.status() < 500 || attempt >= tries) return res
    await new Promise((resolve) => setTimeout(resolve, 250 * attempt))
  }
}

/** The owner's token: the global setup's saved session first (sign-in is rate-limited per address,
 * `support/sessions.ts`), else a login, else the first-register bootstrap. */
export async function signIn(request: APIRequestContext): Promise<Jwt> {
  if (cachedToken !== null) return cachedToken
  const saved = savedToken(OWNER.email)
  if (saved) return (cachedToken = saved)
  const post = (path: string, data: Record<string, unknown>) =>
    retrying(() => request.post(`${BASE_URL}${path}`, { headers: HOST_HEADER, data }))
  const tokenOf = async (res: APIResponse) =>
    res.ok() ? ((JSON.parse(await res.text()) as { token?: string }).token ?? null) : null

  const login = () => post('/api/users/login', { email: OWNER.email, password: OWNER.password })
  let token = await tokenOf(await login())
  if (token) return (cachedToken = token)
  // No owner yet: first-register answers 403 once a user exists, so either it or a second login
  // yields the token (the `hosts/admin-origin.spec.ts` pattern).
  const first = await post('/api/users/first-register', {
    ...OWNER,
    confirmPassword: OWNER.password,
    name: 'E2E Owner',
  })
  token = await tokenOf(first)
  if (token) return (cachedToken = token)
  const again = await login()
  token = await tokenOf(again)
  if (token) return (cachedToken = token)
  throw new Error(
    `could not sign the owner in: first-register ${first.status()}, login ${again.status()}`,
  )
}

const auth = (token: Jwt) => ({ ...HOST_HEADER, Authorization: `JWT ${token}` })

/** A REST write that must succeed, or the fixture is not there to prove anything with. */
async function okId(res: APIResponse, what: string): Promise<number> {
  if (!res.ok()) throw new Error(`${what} failed: ${res.status()} ${await res.text()}`)
  return ((await res.json()) as { doc: { id: number } }).doc.id
}

/** An empty ledger; `createGalleryFixtures` fills it as it goes. */
export function newLedger(request: APIRequestContext): Ledger {
  const created: Created[] = []
  return {
    created,
    cleanup: async () => {
      if (created.length === 0) return
      const token = await signIn(request)
      const failed: string[] = []
      // Newest first: a work goes before the media and place it references.
      for (const { collection, id } of [...created].reverse()) {
        const res = await retrying(() =>
          request.delete(`${BASE_URL}/api/${collection}/${id}`, { headers: auth(token) }),
        )
        if (!res.ok() && res.status() !== 404) failed.push(`${collection}/${id} ${res.status()}`)
      }
      created.length = 0
      if (failed.length > 0) throw new Error(`fixture cleanup failed: ${failed.join(', ')}`)
    },
  }
}

/** A seeded condition grade's id, or a fresh one (on the ledger) — the publish guard wants one. */
async function gradeId(request: APIRequestContext, token: Jwt, ledger: Ledger): Promise<number> {
  const found = await retrying(() =>
    request.get(`${BASE_URL}/api/terms?where[kind][equals]=grade&limit=1`, {
      headers: auth(token),
    }),
  )
  if (!found.ok()) throw new Error(`GET /api/terms?kind=grade failed: ${found.status()}`)
  const body = (await found.json()) as { docs: { id: number }[] }
  if (body.docs[0]) return body.docs[0].id
  const id = await okId(
    await request.post(`${BASE_URL}/api/terms`, {
      headers: auth(token),
      data: {
        kind: 'grade',
        label: 'E2E Grade',
        // Publishing a grade requires a definition and its A–D equivalent (`term-grade.ts`).
        equivalent: 'B+',
        definition: 'E2E probe grade: complete sheet, light even browning, small margins.',
        _status: 'published',
      },
    }),
    'POST /api/terms',
  )
  ledger.created.push({ collection: 'terms', id })
  return id
}

/** Uploads a recto (fields in the `_payload` JSON part, `media/test-stack.test-support.ts`). */
async function rectoId(request: APIRequestContext, token: Jwt, alt: string): Promise<number> {
  return okId(
    await request.post(`${BASE_URL}/api/media`, {
      headers: auth(token),
      multipart: {
        _payload: JSON.stringify({
          alt,
          altSource: 'cataloguer',
          subject: 'work',
          role: 'recto',
          provenance: 'photograph',
        }),
        file: {
          name: `e2e-recto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`,
          mimeType: 'image/png',
          buffer: PNG_1X1,
        },
      },
    }),
    'POST /api/media',
  )
}

/** Makes the place, the published work (with a draft revision) and its draft twin. */
export async function createGalleryFixtures(
  request: APIRequestContext,
  ledger: Ledger,
): Promise<GalleryFixtures> {
  const token = await signIn(request)
  const stamp = Date.now()
  const pairWord = `Quillon${stamp}`
  const draftWord = `Zephyr${stamp}`
  const revisionWord = `Revenant${stamp}`
  const publishedTitle = `E2E Harbour ${stamp} ${pairWord}`
  const draftTitle = `E2E Draft ${stamp} ${pairWord} ${draftWord}`
  const track = (collection: string, id: number) => {
    ledger.created.push({ collection, id })
    return id
  }

  const placeId = track(
    'places',
    await okId(
      await request.post(`${BASE_URL}/api/places`, {
        headers: auth(token),
        data: {
          name: `E2E Jakarta ${stamp}`,
          slug: `e2e-jakarta-${stamp}`,
          historicalNames: [{ name: 'Batavia', language: 'nl' }],
          _status: 'published',
        },
      }),
      'POST /api/places',
    ),
  )
  const grade = await gradeId(request, token, ledger)
  const work = (title: string, media: number, askingPrice: number) => ({
    title,
    objectType: 'map',
    // Browse and search list `status` available/on-hold only (state.ts); pinned, not defaulted.
    status: 'available',
    date: { precision: 'circa', from: 1880 },
    places: [{ place: placeId, role: 'depicts', primary: true }],
    images: [{ media }],
    condition: { grade },
    askingPrice,
  })

  const publishedMedia = track(
    'media',
    await rectoId(request, token, 'A harbour chart, whole sheet'),
  )
  const publishedId = track(
    'works',
    await okId(
      await request.post(`${BASE_URL}/api/works`, {
        headers: auth(token),
        data: { ...work(publishedTitle, publishedMedia, PUBLISHED_PRICE), _status: 'published' },
      }),
      'POST /api/works (published)',
    ),
  )
  // A newer, unpublished revision of the published work: only the versions table holds it. A
  // PATCH is idempotent, so it alone is retried on a dropped connection (a retried POST could
  // make a record the ledger never sees).
  await okId(
    await retrying(() =>
      request.patch(`${BASE_URL}/api/works/${publishedId}?draft=true`, {
        headers: auth(token),
        data: { title: `${publishedTitle} ${revisionWord}`, _status: 'draft' },
      }),
    ),
    'PATCH /api/works (draft revision)',
  )

  const draftMedia = track('media', await rectoId(request, token, 'A harbour chart, twin sheet'))
  track(
    'works',
    await okId(
      await request.post(`${BASE_URL}/api/works?draft=true`, {
        headers: auth(token),
        data: { ...work(draftTitle, draftMedia, DRAFT_PRICE), _status: 'draft' },
      }),
      'POST /api/works (draft)',
    ),
  )

  return { publishedTitle, pairWord, draftTitle, draftWord, revisionWord }
}

/**
 * The owner's own REST read of a work's latest version whose title contains `word` — the proof a
 * draft fixture exists (only a staff read can show it), with its `_status`.
 */
export async function ownerReadsWord(
  request: APIRequestContext,
  word: string,
): Promise<{ titles: string[]; statuses: string[] }> {
  const token = await signIn(request)
  const res = await retrying(() =>
    request.get(
      `${BASE_URL}/api/works?where[title][contains]=${encodeURIComponent(word)}&draft=true&depth=0`,
      { headers: auth(token) },
    ),
  )
  if (!res.ok()) throw new Error(`GET /api/works (owner, draft=true) failed: ${res.status()}`)
  const docs = ((await res.json()) as { docs: { title?: string; _status?: string }[] }).docs
  return { titles: docs.map((d) => d.title ?? ''), statuses: docs.map((d) => d._status ?? '') }
}
