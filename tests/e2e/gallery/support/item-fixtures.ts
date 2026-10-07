/**
 * The item page e2e's fixtures (5.2.e Check): a place, a grade, one large recto and two
 * published works sharing it — `available` and `sold` — each with a distinctive asking price and
 * stock number. Removed in the spec's `afterAll` through `support/fixtures.ts`'s `Ledger` (reused,
 * not duplicated): this module only builds the records and the image.
 *
 * **No `sharp` here**: it is a dependency of `@engine/media` alone, resolvable from source files
 * under `engine/packages/media/`, never from `tests/e2e/`, which sits outside every pnpm workspace
 * package and gets no symlink to it — and adding it to the root `package.json` would touch a path
 * this ticket does not own. `makePatternPng` writes a real, sniffable PNG by hand (`node:zlib`
 * alone): a deterministic 8 px checkerboard, so every 512 px IIIF tile has contrast and none is
 * dropped as blank (`@engine/media/tiles`' `skipBlanks`). No EXIF — nothing in this Check reads
 * one; that claim is `media.pipeline.storage.db.test.ts`'s (F3), on a real JPEG there.
 */
import { deflateSync } from 'node:zlib'

import type { APIRequestContext } from '@playwright/test'

import { BASE_URL, HOST_HEADER } from './env'
import type { Ledger } from './fixtures'

// A hand-built PNG: signature, IHDR, one IDAT, IEND. No external encoder.
const CRC_TABLE = ((): Uint32Array => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typed), 0)
  return Buffer.concat([length, typed, crc])
}

/** A real, sniffable PNG at any size: a deterministic 8 px checkerboard (never a blank tile). */
export function makePatternPng(width: number, height: number): Buffer {
  const LIGHT = 220
  const DARK = 40
  const rowBytes = width * 3 + 1
  const rows: [Buffer, Buffer] = [Buffer.alloc(rowBytes), Buffer.alloc(rowBytes)]
  for (const parity of [0, 1] as const) {
    const row = rows[parity]
    row[0] = 0 // filter: none
    for (let x = 0; x < width; x += 1) {
      const value = (((x >> 3) ^ parity) & 1) === 0 ? LIGHT : DARK
      const at = 1 + x * 3
      row[at] = value
      row[at + 1] = value
      row[at + 2] = value
    }
  }
  const raw = Buffer.alloc(rowBytes * height)
  for (let y = 0; y < height; y += 1) rows[(y >> 3) & 1].copy(raw, y * rowBytes)

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour (RGB)
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 6 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// REST fixtures: the owner's token, a place, a grade, the big recto, two works.
export type WorkRef = { readonly id: number; readonly publicId: number; readonly slug: string }

export type ItemFixtures = {
  readonly available: WorkRef
  readonly sold: WorkRef
  readonly stockAvailable: string
  readonly stockSold: string
  readonly availableTitle: string
  readonly soldTitle: string
  readonly availablePrice: number
  readonly soldPrice: number
  /** The big recto's storage address, for the anonymous `uploads/` read. */
  readonly upload: { readonly prefix: string; readonly filename: string }
  /** The big recto's alt text: the viewer's `role="group"` label once it opens. */
  readonly recto: { readonly alt: string }
}

const auth = (token: string) => ({ ...HOST_HEADER, Authorization: `JWT ${token}` })

/** Runs `call` up to `tries` times on a transient failure: the shared dev Postgres drops a new
 * connection under other worktrees' load (`support/fixtures.ts`'s own `retrying`, not exported —
 * this is the same small shape, not the fixture logic the ticket says not to duplicate). */
async function retrying<T extends { status(): number }>(
  call: () => Promise<T>,
  tries = 4,
): Promise<T> {
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

async function okJson<T>(res: { ok(): boolean; status(): number; text(): Promise<string> }) {
  if (!res.ok()) throw new Error(`${res.status()} ${await res.text()}`)
  return JSON.parse(await res.text()) as T
}

/** A published condition grade: the seeded or an earlier run's, else a fresh one. */
async function gradeId(request: APIRequestContext, token: string, ledger: Ledger): Promise<number> {
  const found = await retrying(() =>
    request.get(`${BASE_URL}/api/terms?where[kind][equals]=grade&limit=1`, {
      headers: auth(token),
    }),
  )
  const docs = (await okJson<{ docs: { id: number }[] }>(found)).docs
  if (docs[0]) return docs[0].id
  // Never retried: a dropped response after a real create would duplicate the term.
  const created = await request.post(`${BASE_URL}/api/terms`, {
    headers: auth(token),
    data: {
      kind: 'grade',
      label: 'E2E Grade 5.2e',
      equivalent: 'B+',
      definition: 'E2E 5.2e probe grade: complete sheet, light even browning, small margins.',
      _status: 'published',
    },
  })
  const id = (await okJson<{ doc: { id: number } }>(created)).doc.id
  ledger.created.push({ collection: 'terms', id })
  return id
}

/** Polls one media record until its derivatives and tiles are `ready`, or fails hard by 180 s. */
async function waitForTilesReady(
  request: APIRequestContext,
  token: string,
  id: number,
): Promise<void> {
  const deadline = Date.now() + 180_000
  for (;;) {
    const res = await retrying(() =>
      request.get(`${BASE_URL}/api/media/${id}?depth=0`, { headers: auth(token) }),
    )
    const doc = await okJson<Record<string, unknown>>(res)
    const derivatives = (doc.derivatives ?? {}) as { status?: string }
    const iiif = (doc.iiif ?? {}) as { status?: string }
    if (derivatives.status === 'ready' && iiif.status === 'ready') return
    if (derivatives.status === 'failed' || iiif.status === 'failed') {
      throw new Error(
        `media ${id} pipeline failed: derivatives=${derivatives.status} iiif=${iiif.status}`,
      )
    }
    if (Date.now() > deadline) {
      throw new Error(
        `media ${id} not ready after 180s: derivatives=${derivatives.status} iiif=${iiif.status}`,
      )
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000))
  }
}

/** Builds the place, the grade, the big recto (polled to `ready`) and the two works. */
export async function createItemFixtures(
  request: APIRequestContext,
  ledger: Ledger,
  token: string,
): Promise<ItemFixtures> {
  const stamp = Date.now()
  const track = (collection: string, id: number) => {
    ledger.created.push({ collection, id })
    return id
  }

  const createId = async (collection: string, data: Record<string, unknown>): Promise<number> => {
    const res = await okJson<{ doc: { id: number } }>(
      await request.post(`${BASE_URL}/api/${collection}`, { headers: auth(token), data }),
    )
    return track(collection, res.doc.id)
  }
  const place = await createId('places', {
    name: `E2E 5.2e Place ${stamp}`,
    slug: `e2e-52e-place-${stamp}`,
    _status: 'published',
  })
  const grade = await gradeId(request, token, ledger)

  // Over the 2,400 px ladder top rung and under the gallery's 4,096 px zoom cap, so the pipeline
  // both tiles it and caps the pyramid — the same shape as 5.2media's own runtime proof.
  const png = makePatternPng(5200, 3600)
  const alt = `A harbour chart, whole sheet, generated for 5.2e ${stamp}`
  const uploaded = await okJson<{ doc: Record<string, unknown> }>(
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
        file: { name: `e2e-52e-recto-${stamp}.png`, mimeType: 'image/png', buffer: png },
      },
    }),
  )
  const mediaId = track('media', Number(uploaded.doc.id))
  await waitForTilesReady(request, token, mediaId)
  // The record's own storage address — never a default, so a renamed prefix fails here.
  const { prefix, filename } = uploaded.doc
  if (typeof prefix !== 'string' || typeof filename !== 'string' || filename === '') {
    throw new Error(
      `media ${mediaId} has no storage address: ${JSON.stringify({ prefix, filename })}`,
    )
  }
  const upload = { prefix, filename }

  const stockAvailable = `M.52E2E${stamp}A`
  const stockSold = `M.52E2E${stamp}S`
  const availablePrice = 9_876_543
  const soldPrice = 8_765_432

  const work = (
    status: 'available' | 'sold',
    title: string,
    stockNumber: string,
    price: number,
  ) => ({
    title,
    objectType: 'map',
    status,
    stockNumber,
    date: { precision: 'circa', from: 1880 },
    places: [{ place, role: 'depicts', primary: true }],
    images: [{ media: mediaId }],
    condition: { grade },
    askingPrice: price,
    _status: 'published' as const,
  })

  const createWork = async (data: ReturnType<typeof work>): Promise<WorkRef> => {
    type Doc = { id: number; publicId: number; slug: string; askingPrice?: number }
    const res = await okJson<{ doc: Doc }>(
      await request.post(`${BASE_URL}/api/works`, { headers: auth(token), data }),
    )
    track('works', res.doc.id)
    // The control for the no-price claim: the price is really stored, so its absence means hiding.
    if (res.doc.askingPrice !== data.askingPrice) {
      throw new Error(`work ${res.doc.id} stored askingPrice ${res.doc.askingPrice}`)
    }
    return { id: res.doc.id, publicId: res.doc.publicId, slug: res.doc.slug }
  }

  const availableTitle = `E2E 5.2e Available ${stamp}`
  const soldTitle = `E2E 5.2e Sold ${stamp}`
  const available = await createWork(
    work('available', availableTitle, stockAvailable, availablePrice),
  )
  const sold = await createWork(work('sold', soldTitle, stockSold, soldPrice))

  return {
    available,
    sold,
    stockAvailable,
    stockSold,
    availableTitle,
    soldTitle,
    availablePrice,
    soldPrice,
    upload,
    recto: { alt },
  }
}
