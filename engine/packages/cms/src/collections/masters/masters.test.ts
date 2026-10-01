import { intakeMasterKey, masterKey, printFileKey } from '@engine/media/contract'
import type { MastersStore } from '@engine/media/storage'
import { describe, expect, it, vi } from 'vitest'

import { verifyInBucket } from './hooks'
import { Masters } from './index'
import { parseIntakeManifest } from './intake-manifest'
import { isOutlet } from './attribution'
import { keyFor, parseUploadRequest, uploadUrlHandler } from './upload-url'
import { masterProblems } from './validators'

const SHA = 'c'.repeat(64)
// Brand slugs by name, never `slug: '…'` literals: route parity reads those as collection slugs.
const SHOP = 'shop'
const SISTER = 'sister'
type Hook = (args: never) => unknown
const call = (hook: Hook, args: Record<string, unknown>) => hook(args as never)
const paths = (input: object) => masterProblems(input).map((p) => p.path)
const capture = {
  kind: 'capture',
  storageKey: masterKey('m-000123', SHA, 'cr3'),
  checksum: SHA,
  brand: 'test',
  role: 'recto',
  provenance: 'photograph',
}

describe('the masters collection (8.3.b)', () => {
  it('is a plain collection — no upload, no URL — read by staff alone', () => {
    expect(Masters.slug).toBe('masters')
    expect(Masters.upload).toBeUndefined()
    const names = JSON.stringify(Masters.fields)
    expect(names).not.toMatch(/"name":"url"/)
    const read = Masters.access!.read as (a: unknown) => unknown
    expect(read({ req: { user: null } })).toBe(false)
    expect(read({ req: { user: { collection: 'customers' } } })).toBe(false)
    expect(read({ req: { user: { collection: 'users', roles: ['analyst'] } } })).toBe(true)
    expect(Masters.endpoints).toEqual([
      expect.objectContaining({ path: '/upload-url', method: 'post' }),
    ])
  })
})

describe('a master is consistent with itself (8.3.f)', () => {
  it('accepts a capture filed by C9, an intake capture and a print file', () => {
    expect(masterProblems(capture)).toEqual([])
    const intake = intakeMasterKey('test', 'pilot-2026-10', SHA, 'cr3')
    expect(
      masterProblems({ ...capture, storageKey: intake, intake: { batch: 'pilot-2026-10' } }),
    ).toEqual([])
    expect(
      masterProblems({
        kind: 'print-file',
        storageKey: printFileKey('test', 'd-1', SHA, 'tif'),
        checksum: SHA,
        brand: 'test',
      }),
    ).toEqual([])
  })

  it('refuses a key that names another file, another prefix, or climbs out', () => {
    expect(paths({ ...capture, storageKey: masterKey('m-1', 'd'.repeat(64), 'cr3') })).toEqual([
      'storageKey',
    ])
    expect(paths({ ...capture, storageKey: printFileKey('test', 'd-1', SHA, 'tif') })).toEqual([
      'storageKey',
    ])
    expect(paths({ ...capture, storageKey: `masters/../print-files/${SHA}.cr3` })).toEqual([
      'storageKey',
    ])
    expect(paths({ ...capture, storageKey: `/masters/m-1/${SHA}.cr3` })).toEqual(['storageKey'])
    expect(paths({ ...capture, storageKey: masterKey('m-1', SHA, 'exe') })).toEqual(['storageKey'])
    expect(paths({ ...capture, checksum: 'C'.repeat(64) })).toContain('checksum')
  })

  it("holds a capture to the intake's role and provenance, and an intake key to its brand and batch", () => {
    expect(paths({ ...capture, role: null, provenance: undefined })).toEqual(['role', 'provenance'])
    const intake = intakeMasterKey('test', 'pilot-2026-10', SHA, 'cr3')
    expect(
      paths({ ...capture, storageKey: intake, brand: 'other', intake: { batch: 'pilot-2026-11' } }),
    ).toEqual(['brand', 'intake.batch'])
  })

  it("keeps the object's box inside the frame, in whole pixels (C9 boxFits)", () => {
    const framed = { ...capture, widthPx: 3543, heightPx: 2840 }
    expect(paths({ ...framed, objectBox: { x: 120, y: 80, width: 3300, height: 2600 } })).toEqual(
      [],
    )
    expect(paths({ ...framed, objectBox: { x: 300, y: 80, width: 3300, height: 2600 } })).toEqual([
      'objectBox',
    ])
    expect(paths({ ...framed, objectBox: { x: 1.5, y: 0, width: 10, height: 10 } })).toEqual([
      'objectBox',
    ])
    expect(paths({ ...capture, objectBox: { x: 0, y: 0, width: 10, height: 10 } })).toEqual([
      'objectBox',
    ])
    expect(
      paths({ ...framed, objectBox: { x: null, y: null, width: null, height: null } }),
    ).toEqual([])
    expect(paths({ ...framed, objectPpi: 0 })).toEqual(['objectPpi'])
  })
})

describe('the upload step (8.3.b)', () => {
  const declared = { kind: 'capture', checksum: SHA, extension: 'CR3', byteSize: 1000 }

  it('builds the key C9 files each kind of upload under', () => {
    const parse = (body: object) => {
      const parsed = parseUploadRequest(body)
      if ('problems' in parsed) throw new Error(parsed.problems.join(' '))
      return parsed.request
    }
    expect(keyFor(parse({ ...declared, workUid: 'm-000123' }), 'test')).toBe(
      masterKey('m-000123', SHA, 'cr3'),
    )
    expect(keyFor(parse({ ...declared, batch: 'pilot-2026-10' }), 'test')).toBe(
      intakeMasterKey('test', 'pilot-2026-10', SHA, 'cr3'),
    )
    expect(
      keyFor(
        parse({ ...declared, kind: 'print-file', extension: 'tif', designUid: 'd-1' }),
        'test',
      ),
    ).toBe(printFileKey('test', 'd-1', SHA, 'tif'))
  })

  it('names every problem with a declaration', () => {
    const problems = (body: object) =>
      'problems' in parseUploadRequest(body) ? parseUploadRequest(body) : null
    expect(problems({ ...declared })).toMatchObject({
      problems: [expect.stringMatching(/names its work/)],
    })
    expect(problems({ ...declared, workUid: 'm-1', batch: 'b' })).not.toBeNull()
    expect(problems({ ...declared, kind: 'print-file', workUid: 'm-1' })).not.toBeNull()
    expect(problems({ ...declared, workUid: '../m-1' })).not.toBeNull()
    expect(problems({ ...declared, workUid: 'm-1', byteSize: 6 * 1024 ** 3 })).not.toBeNull()
    expect(problems({ kind: 'master', checksum: 'x', extension: '.tif' })).toMatchObject({
      problems: expect.arrayContaining([
        expect.stringMatching(/^kind/),
        expect.stringMatching(/^checksum/),
      ]),
    })
  })

  it('knows an outlet by its sister being the archive origin', () => {
    const sister = (role: string) => [
      { slug: SISTER, name: 'S', role, baseUrl: 'https://s.example' },
    ]
    expect(isOutlet({ slug: SHOP, sisters: sister('archive-origin') } as never)).toBe(true)
    expect(isOutlet({ slug: SHOP, sisters: sister('merch-outlet') } as never)).toBe(false)
    expect(isOutlet({ slug: SHOP, sisters: [] } as never)).toBe(false)
  })

  it('answers who may ask, and refuses an outlet a capture before the storage would', async () => {
    const store = {
      presignPut: vi.fn(async () => ({ url: 'http://s/x' })),
    } as unknown as MastersStore
    const find = vi.fn(async () => ({ docs: [] }))
    const outlet = {
      slug: SHOP,
      sisters: [{ slug: SISTER, name: 'G', role: 'archive-origin', baseUrl: 'https://g.example' }],
    }
    const handler = uploadUrlHandler({ store: () => store, brand: () => outlet as never })
    const req = (user: unknown, data: object) => ({ user, data, payload: { find } }) as never
    const cataloguer = { collection: 'users', roles: ['cataloguer'] }
    expect((await handler(req(null, declared))).status).toBe(401)
    expect((await handler(req({ collection: 'users', roles: ['editor'] }, declared))).status).toBe(
      403,
    )
    expect((await handler(req(cataloguer, { ...declared, workUid: 'm-1' }))).status).toBe(403)
    const printFile = { ...declared, kind: 'print-file', extension: 'tif', designUid: 'd-1' }
    expect((await handler(req(cataloguer, printFile))).status).toBe(200)
    expect(store.presignPut).toHaveBeenCalledWith(
      expect.objectContaining({
        key: printFileKey('shop', 'd-1', SHA, 'tif'),
        contentType: 'image/tiff',
      }),
    )
    const none = uploadUrlHandler({ store: () => null, brand: () => outlet as never })
    expect((await none(req(cataloguer, printFile))).status).toBe(503)
  })
})

describe('completing an upload: the record checks the bucket', () => {
  const store = (held: { checksum: string | null; byteSize?: number } | null, hashed = SHA) =>
    ({
      head: vi.fn(async () =>
        held
          ? {
              byteSize: held.byteSize ?? 10,
              checksum: held.checksum,
              contentType: 'image/x-canon-cr3',
            }
          : null,
      ),
      hash: vi.fn(async () => hashed),
    }) as unknown as MastersStore
  const create = (source: MastersStore | null, extra: object = {}) =>
    call(
      verifyInBucket(() => source),
      {
        operation: 'create',
        data: { ...capture },
        context: {},
        req: { payloadAPI: 'REST' },
        ...extra,
      },
    )

  it('records the size and type of the file the bucket holds under the checksum declared', async () => {
    expect(await create(store({ checksum: SHA, byteSize: 42 }))).toMatchObject({
      byteSize: 42,
      contentType: 'image/x-canon-cr3',
    })
  })

  it('refuses a missing file, another file, a file stored without its checksum, and no bucket', async () => {
    await expect(create(store(null))).rejects.toThrow()
    await expect(create(store({ checksum: 'd'.repeat(64) }))).rejects.toThrow()
    await expect(create(store({ checksum: null }))).rejects.toThrow()
    await expect(create(null)).rejects.toThrow()
  })

  it('hashes a file with no stored checksum only for the intake import, on the Local API', async () => {
    const held = store({ checksum: null })
    expect(
      await create(held, { context: { verifyByHash: true }, req: { payloadAPI: 'local' } }),
    ).toMatchObject({ byteSize: 10 })
    await expect(
      create(store({ checksum: null }), { context: { verifyByHash: true } }),
    ).rejects.toThrow()
    await expect(
      create(store({ checksum: null }, 'e'.repeat(64)), {
        context: { verifyByHash: true },
        req: { payloadAPI: 'local' },
      }),
    ).rejects.toThrow()
  })
})

describe('an intake manifest', () => {
  const entry = {
    checksum: SHA,
    extension: 'cr3',
    receivedAs: 'M-9999_recto_01.cr3',
    reference: 'M.9999',
    role: 'recto',
    provenance: 'photograph',
    widthPx: 6000,
    heightPx: 4000,
    objectBox: null,
    objectPpi: null,
    captureTier: null,
    verdict: 'legacy',
    retouching: 'unknown',
    notes: [],
  }
  const manifest = {
    brand: 'test',
    batch: 'pilot-2026-10',
    receivedAt: '2026-10-01T09:00:00+08:00',
    entries: [entry],
  }

  it("parses one in C9's shape, and names every problem with one that is not", () => {
    expect(parseIntakeManifest(manifest)).toEqual({ manifest })
    const bad = parseIntakeManifest({
      ...manifest,
      batch: 'Pilot 1',
      entries: [entry, { ...entry, role: 'primary', provenance: 'stock', objectBox: { x: 1 } }],
    })
    expect(bad).toMatchObject({
      problems: expect.arrayContaining([
        'batch: a kebab-case id',
        expect.stringMatching(/^entries\[1\]\.role/),
        expect.stringMatching(/^entries\[1\]\.provenance/),
        expect.stringMatching(/^entries\[1\]\.objectBox/),
        'entries[1].checksum: listed twice',
      ]),
    })
  })
})
