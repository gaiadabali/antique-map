import { intakeMasterKey, masterKey } from '@engine/media/contract'
import type { MastersStore } from '@engine/media/storage'
import { describe, expect, it, vi } from 'vitest'

import { verifyInBucket } from './hooks'
import { Masters } from './index'
import { parseIntakeManifest } from './intake-manifest'
import { keyFor, parseUploadRequest, uploadUrlHandler } from './upload-url'
import { masterProblems } from './validators'

const SHA = 'c'.repeat(64)
type Hook = (args: never) => unknown
const call = (hook: Hook, args: Record<string, unknown>) => hook(args as never)
const paths = (input: object) => masterProblems(input).map((p) => p.path)
const capture = {
  kind: 'capture',
  storageKey: masterKey('m-000123', SHA, 'cr3'),
  checksum: SHA,
  role: 'recto',
  provenance: 'photograph',
}

describe('the masters collection (8.3.b)', () => {
  it('is a plain collection — no upload, no URL — read by the owner and the editors alone', () => {
    expect(Masters.slug).toBe('masters')
    expect(Masters.upload).toBeUndefined()
    const names = JSON.stringify(Masters.fields)
    expect(names).not.toMatch(/"name":"url"/)
    const read = Masters.access!.read as (a: unknown) => unknown
    expect(read({ req: { user: null } })).toBe(false)
    expect(read({ req: { user: { collection: 'customers' } } })).toBe(false)
    expect(read({ req: { user: { collection: 'users', role: 'editor' } } })).toBe(true)
    expect(read({ req: { user: { collection: 'users', role: 'owner' } } })).toBe(true)
    expect(read({ req: { user: { collection: 'users', role: 'store', store: 1 } } })).toBe(false)
    expect(JSON.stringify(Masters.fields)).not.toMatch(/"name":"(brand|design)"/)
    expect(Masters.endpoints).toEqual([
      expect.objectContaining({ path: '/upload-url', method: 'post' }),
    ])
  })
})

describe('a master is consistent with itself (8.3.f)', () => {
  it('accepts a capture filed by C9 and an intake capture, and nothing but a capture', () => {
    expect(masterProblems(capture)).toEqual([])
    const intake = intakeMasterKey('pilot-2026-10', SHA, 'cr3')
    expect(
      masterProblems({ ...capture, storageKey: intake, intake: { batch: 'pilot-2026-10' } }),
    ).toEqual([])
    expect(paths({ ...capture, kind: 'print-file' })).toEqual(['kind'])
  })

  it('refuses a key that names another file, another prefix, or climbs out', () => {
    expect(paths({ ...capture, storageKey: masterKey('m-1', 'd'.repeat(64), 'cr3') })).toEqual([
      'storageKey',
    ])
    expect(paths({ ...capture, storageKey: `print-files/d-1/${SHA}.tif` })).toEqual(['storageKey'])
    expect(paths({ ...capture, storageKey: `masters/../print-files/${SHA}.cr3` })).toEqual([
      'storageKey',
    ])
    expect(paths({ ...capture, storageKey: `/masters/m-1/${SHA}.cr3` })).toEqual(['storageKey'])
    expect(paths({ ...capture, storageKey: masterKey('m-1', SHA, 'exe') })).toEqual(['storageKey'])
    expect(paths({ ...capture, checksum: 'C'.repeat(64) })).toContain('checksum')
  })

  it("holds a capture to the intake's role and provenance, and an intake key to its batch", () => {
    expect(paths({ ...capture, role: null, provenance: undefined })).toEqual(['role', 'provenance'])
    const intake = intakeMasterKey('pilot-2026-10', SHA, 'cr3')
    expect(paths({ ...capture, storageKey: intake, intake: { batch: 'pilot-2026-11' } })).toEqual([
      'intake.batch',
    ])
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

  it('builds the key C9 files each upload under, with no brand segment', () => {
    const parse = (body: object) => {
      const parsed = parseUploadRequest(body)
      if ('problems' in parsed) throw new Error(parsed.problems.join(' '))
      return parsed.request
    }
    expect(keyFor(parse({ ...declared, workUid: 'm-000123' }))).toBe(
      masterKey('m-000123', SHA, 'cr3'),
    )
    expect(keyFor(parse({ ...declared, batch: 'pilot-2026-10' }))).toBe(
      intakeMasterKey('pilot-2026-10', SHA, 'cr3'),
    )
  })

  it('names every problem with a declaration', () => {
    const problems = (body: object) =>
      'problems' in parseUploadRequest(body) ? parseUploadRequest(body) : null
    expect(problems({ ...declared })).toMatchObject({
      problems: [expect.stringMatching(/names its work/)],
    })
    expect(problems({ ...declared, workUid: 'm-1', batch: 'b' })).not.toBeNull()
    expect(problems({ ...declared, kind: 'print-file', designUid: 'd-1' })).toMatchObject({
      problems: expect.arrayContaining([expect.stringMatching(/^kind/)]),
    })
    expect(problems({ ...declared, workUid: '../m-1' })).not.toBeNull()
    expect(problems({ ...declared, workUid: 'm-1', byteSize: 6 * 1024 ** 3 })).not.toBeNull()
    expect(problems({ kind: 'master', checksum: 'x', extension: '.tif' })).toMatchObject({
      problems: expect.arrayContaining([
        expect.stringMatching(/^kind/),
        expect.stringMatching(/^checksum/),
      ]),
    })
  })

  it('answers who may ask: the owner and the editors, never store staff', async () => {
    const store = {
      presignPut: vi.fn(async () => ({ url: 'http://s/x' })),
    } as unknown as MastersStore
    const find = vi.fn(async () => ({ docs: [] }))
    const handler = uploadUrlHandler({ store: () => store })
    const req = (user: unknown, data: object) => ({ user, data, payload: { find } }) as never
    const editor = { collection: 'users', role: 'editor' }
    const capture = { ...declared, workUid: 'm-1' }
    expect((await handler(req(null, capture))).status).toBe(401)
    expect(
      (await handler(req({ collection: 'users', role: 'store', store: 1 }, capture))).status,
    ).toBe(403)
    expect((await handler(req(editor, capture))).status).toBe(200)
    expect((await handler(req({ collection: 'users', role: 'owner' }, capture))).status).toBe(200)
    expect(store.presignPut).toHaveBeenCalledWith(
      expect.objectContaining({
        key: masterKey('m-1', SHA, 'cr3'),
        contentType: 'image/x-canon-cr3',
      }),
    )
    const none = uploadUrlHandler({ store: () => null })
    expect((await none(req(editor, capture))).status).toBe(503)
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
