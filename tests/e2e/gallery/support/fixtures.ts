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

async function signIn(request: APIRequestContext): Promise<Jwt> {
  const login = await request.post(`${BASE_URL}/api/users/login`, {
    headers: HOST_HEADER,
    data: { email: OWNER.email, password: OWNER.password },
  })
  if (login.ok()) {
    const body = (await login.json()) as { token?: string }
    if (body.token) return body.token
  }
  const first = await request.post(`${BASE_URL}/api/users/first-register`, {
    headers: HOST_HEADER,
    data: { ...OWNER, confirmPassword: OWNER.password, name: 'E2E Owner' },
  })
  const body = (await first.json()) as { token?: string }
  if (!first.ok() || !body.token) {
    throw new Error(`could not sign the owner in: ${first.status()} ${JSON.stringify(body)}`)
  }
  return body.token
}

const auth = (token: Jwt) => ({ ...HOST_HEADER, Authorization: `JWT ${token}` })

/** A REST write that must succeed, or the fixture is not there to prove anything with. */
async function expectOk(res: { ok(): boolean; status(): number; text(): Promise<string> }, what: string) {
  if (!res.ok()) throw new Error(`${what} failed: ${res.status()} ${await res.text()}`)
}

/** A seeded condition grade's id, or a fresh one — the publish guard wants a grade on the record. */
async function gradeId(request: APIRequestContext, token: Jwt): Promise<number> {
  const found = await request.get(`${BASE_URL}/api/terms?where[kind][equals]=grade&limit=1`, {
    headers: auth(token),
  })
  await expectOk(found, 'GET /api/terms?kind=grade')
  const body = (await found.json()) as { docs: { id: number }[] }
  if (body.docs[0]) return body.docs[0].id
  const created = await request.post(`${BASE_URL}/api/terms`, {
    headers: auth(token),
    data: { kind: 'grade', label: 'E2E Grade', _status: 'published' },
  })
  await expectOk(created, 'POST /api/terms')
  return ((await created.json()) as { doc: { id: number } }).doc.id
}

/** Uploads the recto and answers its media id. */
async function rectoId(request: APIRequestContext, token: Jwt, title: string): Promise<number> {
  const uploaded = await request.post(`${BASE_URL}/api/media`, {
    headers: auth(token),
    multipart: {
      file: { name: 'e2e-recto.png', mimeType: 'image/png', buffer: PNG_1X1 },
      alt: `${title} — the whole sheet`,
      altSource: 'cataloguer',
      subject: 'work',
      role: 'recto',
      provenance: 'photograph',
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
      date: { precision: 'circa', from: 1880 },
      places: [{ place: placeId, role: 'depicts', primary: true }],
      images: [{ media }],
      condition: { grade },
      _status: 'published',
    },
  })
  await expectOk(published, 'POST /api/works (published)')
  const publishedId = ((await published.json()) as { doc: { id: number } }).doc.id

  const draft = await request.post(`${BASE_URL}/api/works`, {
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
  const res = await request.get(
    `${BASE_URL}/api/works?where[title][equals]=${encodeURIComponent(title)}&limit=1&draft=true`,
    { headers: auth(token) },
  )
  await expectOk(res, 'GET /api/works (owner, draft=true)')
  const body = (await res.json()) as { docs: { _status?: string }[] }
  const doc = body.docs[0]
  return { found: doc !== undefined, status: doc?._status ?? null }
}
