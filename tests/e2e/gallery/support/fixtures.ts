/**
 * The gallery browse/search e2e's fixtures (TASKS.md 5.1.d), all made in the spec and removed in
 * `afterAll` — never by hand. Payload's REST answers on the shop host (ADMIN_HOST: the shop's, Q1),
 * so every write goes there with a `Host` header while the pages under test are the gallery's.
 *
 * The seed publishes nothing (`seed/run.ts`: the importer writes `_status: 'draft'` without
 * `--publish`), so the spec makes its own published fixture: a place whose modern name is unique
 * and whose historical name is **Batavia**, plus a work catalogued under it. A second, draft work
 * carries a distinctive word nothing else has.
 *
 * Media can only be created as an upload (no plain REST create), so the spec uploads one tiny PNG
 * as the recto: the work's publish guard needs a photographed recto with alt text.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { APIRequestContext } from '@playwright/test'

import { BASE_URL, HOST_HEADER, OWNER } from './env'

/** A 1×1 PNG — a real, sniffable raster for the recto upload. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

export type GalleryFixtures = {
  /** The published work's title, catalogued under a place whose historical name is Batavia. */
  readonly publishedTitle: string
  /** The draft work's title; contains `draftWord`, which no other record carries. */
  readonly draftTitle: string
  readonly draftWord: string
  /** Every id made here, for `afterAll` to remove. */
  readonly cleanup: () => Promise<void>
}

type Jwt = string

/** The signed-in owner's token, kept for the run: one login serves the fixtures, the draft test's
 * staff read and the cleanup, so a dropped connection can never lose it mid-suite. */
let cachedToken: Jwt | null = null

/** Runs `call` up to `tries` times on a transient failure. The shared dev Postgres drops a new
 * connection under other worktrees' load (`admin/local.mjs` retries its fixtures for exactly
 * this): Playwright surfaces the drop as `ECONNRESET` before the request leaves, or the server
 * answers a 5xx after its own query died — so a 5xx is retried here too, never a 4xx. */
async function retrying<T extends { status(): number }>(call: () => Promise<T>, tries = 4): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    let res: T
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

async function signIn(request: APIRequestContext): Promise<Jwt> {
  if (cachedToken !== null) return cachedToken
  const post = (path: string, data: Record<string, unknown>) =>
    retrying(() => request.post(`${BASE_URL}${path}`, { headers: HOST_HEADER, data }))
  const tokenOf = async (res: { ok(): boolean; status(): number; text(): Promise<string> }) =>
    res.ok() ? ((JSON.parse(await res.text()) as { token?: string }).token ?? null) : null

  const login = () => post('/api/users/login', { email: OWNER.email, password: OWNER.password })
  let token = await tokenOf(await login())
  if (token) return (cachedToken = token)
  // No owner yet, or the login's query died: first-register answers 403 when a user already
  // exists (it is once-only), so either it or the login again yields the token.
  const first = await post('/api/users/first-register', {
    ...OWNER,
    confirmPassword: OWNER.password,
    name: 'E2E Owner',
  })
  token = await tokenOf(first)
  if (token) return (cachedToken = token)
  token = await tokenOf(await login())
  if (token) return (cachedToken = token)
  const last = first.status()
  throw new Error(
    `could not sign the owner in: first-register ${last}, login ${await (await login()).status()}`,
  )
}

const auth = (token: Jwt) => ({ ...HOST_HEADER, Authorization: `JWT ${token}` })

/** A REST write that must succeed, or the fixture is not there to prove anything with. */
async function expectOk(res: { ok(): boolean; status(): number; text(): Promise<string> }, what: string) {
  if (!res.ok()) throw new Error(`${what} failed: ${res.status()} ${await res.text()}`)
}

/** A seeded condition grade's id, or a fresh one — the publish guard wants a grade on the record. */
async function gradeId(request: APIRequestContext, token: Jwt): Promise<number> {
  const found = await retrying(() =>
    request.get(`${BASE_URL}/api/terms?where[kind][equals]=grade&limit=1`, { headers: auth(token) }),
  )
  await expectOk(found, 'GET /api/terms?kind=grade')
  const body = (await found.json()) as { docs: { id: number }[] }
  if (body.docs[0]) return body.docs[0].id
  const created = await request.post(`${BASE_URL}/api/terms`, {
    headers: auth(token),
    data: {
      kind: 'grade',
      label: 'E2E Grade',
      definition: 'E2E probe grade: complete sheet, light even browning, small margins.',
      _status: 'published',
    },
  })
  await expectOk(created, 'POST /api/terms')
  return ((await created.json()) as { doc: { id: number } }).doc.id
}

/** Uploads the recto and answers its media id. Payload's REST multipart carries the fields as a
 * `_payload` JSON part beside the file (`media/test-stack.test-support.ts` `form()`), never as
 * loose parts. */
async function rectoId(request: APIRequestContext, token: Jwt, title: string): Promise<number> {
  const uploaded = await request.post(`${BASE_URL}/api/media`, {
    headers: auth(token),
    multipart: {
      _payload: JSON.stringify({
        alt: `${title} — the whole sheet`,
        altSource: 'cataloguer',
        subject: 'work',
        role: 'recto',
        provenance: 'photograph',
      }),
      file: { name: 'e2e-recto.png', mimeType: 'image/png', buffer: PNG_1X1 },
    },
  })
  await expectOk(uploaded, 'POST /api/media')
  return ((await uploaded.json()) as { doc: { id: number } }).doc.id
}

/** Makes the published work, the draft work and the vocabulary they need; answers their titles. */
export async function createGalleryFixtures(request: APIRequestContext): Promise<GalleryFixtures> {
  const token = await signIn(request)
  const stamp = Date.now()
  const publishedTitle = `E2E Batavia ${stamp}`
  const draftWord = `Zephyr${stamp}`
  const draftTitle = `E2E Draft ${stamp} ${draftWord}`

  const place = await request.post(`${BASE_URL}/api/places`, {
    headers: auth(token),
    data: {
      name: `E2E Jakarta ${stamp}`,
      slug: `e2e-jakarta-${stamp}`,
      historicalNames: [{ name: 'Batavia', language: 'nl' }],
      _status: 'published',
    },
  })
  await expectOk(place, 'POST /api/places')
  const placeId = ((await place.json()) as { doc: { id: number } }).doc.id

  const grade = await gradeId(request, token)
  const media = await rectoId(request, token, publishedTitle)

  const published = await request.post(`${BASE_URL}/api/works`, {
    headers: auth(token),
    data: {
      title: publishedTitle,
      objectType: 'map',
      // Browse and search both filter `works.status = ANY(['available','on-hold'])` (state.ts);
      // 'available' is the field's default, set here so the fixture never depends on it.
      status: 'available',
      date: { precision: 'circa', from: 1880 },
      places: [{ place: placeId, role: 'depicts', primary: true }],
      images: [{ media }],
      condition: { grade },
      _status: 'published',
    },
  })
  await expectOk(published, 'POST /api/works (published)')
  const publishedId = ((await published.json()) as { doc: { id: number } }).doc.id

  // `?draft=true` is the ticket's own instruction for a REST draft; `_status: 'draft'` states it
  // too, so the created record reads back as a draft whichever Payload keys off.
  const draft = await request.post(`${BASE_URL}/api/works?draft=true`, {
    headers: auth(token),
    data: { title: draftTitle, objectType: 'map', _status: 'draft' },
  })
  await expectOk(draft, 'POST /api/works (draft)')
  const draftId = ((await draft.json()) as { doc: { id: number } }).doc.id

  return {
    publishedTitle,
    draftTitle,
    draftWord,
    cleanup: async () => {
      const del = (collection: string, id: number) =>
        request.delete(`${BASE_URL}/api/${collection}/${id}`, { headers: auth(token) })
      await del('works', draftId)
      await del('works', publishedId)
      await del('media', media)
      await del('places', placeId)
    },
  }
}

/** Writes a fixture path a page test can read back — used to leave the recto's temp file tidy. */
export function scratch(name: string): string {
  const dir = join(tmpdir(), 'indies-e2e-gallery')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, name)
  writeFileSync(path, PNG_1X1)
  return path
}

/**
 * Whether the owner's own REST read finds a work by its exact title — the proof the draft fixture
 * exists (a draft is invisible to every public read, so only a staff read can show it is there).
 * Also reads `_status`, so the test can say the record is a draft and not an absent one.
 */
export async function ownerReadsTitle(
  request: APIRequestContext,
  title: string,
): Promise<{ found: boolean; status: string | null }> {
  const token = await signIn(request)
  const res = await retrying(() =>
    request.get(
      `${BASE_URL}/api/works?where[title][equals]=${encodeURIComponent(title)}&limit=1&draft=true`,
      { headers: auth(token) },
    ),
  )
  await expectOk(res, 'GET /api/works (owner, draft=true)')
  const body = (await res.json()) as { docs: { _status?: string }[] }
  const doc = body.docs[0]
  return { found: doc !== undefined, status: doc?._status ?? null }
}
