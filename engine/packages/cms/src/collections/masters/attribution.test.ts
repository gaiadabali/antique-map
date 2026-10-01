import { intakeMasterKey, masterKey, printFileKey } from '@engine/media/contract'
import { describe, expect, it } from 'vitest'

import {
  attributionProblems,
  checkAttribution,
  importRefusal,
  isOutlet,
  keptBrands,
  type Brand,
} from './attribution'
import { discardSentFile, dropSentFile, keepWhatIsFixed } from './hooks'
import { Masters } from './index'
import { parseUploadRequest } from './upload-url'

const SHA = 'c'.repeat(64)
// Brand slugs by name, never `slug: '…'` literals: route parity reads those as collection slugs.
const ARCHIVE = 'archive'
const SHOP = 'shop'
const sister = (slug: string, role: string) => ({
  slug,
  name: slug,
  role,
  baseUrl: 'https://s.example',
})
const origin = { slug: ARCHIVE, sisters: [sister(SHOP, 'merch-outlet')] } as unknown as Brand
const outlet = { slug: SHOP, sisters: [sister(ARCHIVE, 'archive-origin')] } as unknown as Brand
const paths = (record: object, brand: Brand | null) =>
  attributionProblems(record, brand).map((p) => p.path)
type Hook = (args: never) => unknown
const call = (hook: Hook, args: Record<string, unknown>) => hook(args as never)

describe('whose a master is (finding 4)', () => {
  const capture = { kind: 'capture', storageKey: masterKey('w-1', SHA, 'cr3'), brand: ARCHIVE }
  const shopsShowroom = {
    kind: 'capture',
    storageKey: intakeMasterKey(SHOP, 'showroom-1', SHA, 'jpg'),
    brand: SHOP,
  }
  const printFile = (owner: string, keyBrand = owner) => ({
    kind: 'print-file',
    storageKey: printFileKey(keyBrand, 'd-1', SHA, 'tif'),
    brand: owner,
  })

  it('knows an outlet by its sister being the archive origin', () => {
    expect(isOutlet(outlet)).toBe(true)
    expect(isOutlet(origin)).toBe(false)
    expect(keptBrands(origin)).toEqual([ARCHIVE, SHOP])
  })

  it("lets the origin keep its own captures and its sister's, and nobody else's", () => {
    expect(paths(capture, origin)).toEqual([])
    expect(paths(shopsShowroom, origin)).toEqual([])
    expect(paths({ ...capture, brand: 'stranger' }, origin)).toEqual(['brand'])
  })

  it('refuses an outlet any capture — its own showroom included: the archive keeps those', () => {
    expect(paths(capture, outlet)).toEqual(['kind'])
    expect(paths(shopsShowroom, outlet)).toEqual(['kind'])
  })

  it('keeps a print file under print-files/<its brand>/, and each brand to its own', () => {
    expect(paths(printFile(SHOP), outlet)).toEqual([])
    expect(paths(printFile(SHOP, 'someone-else'), outlet)).toEqual(['storageKey'])
    expect(paths(printFile('someone-else'), outlet)).toEqual(['brand'])
    expect(paths(printFile(ARCHIVE), origin)).toEqual([])
    // With no brand (a CLI), the key's own brand segment is still checked.
    expect(paths(printFile(SHOP, ARCHIVE), null)).toEqual(['storageKey'])
    expect(paths(capture, null)).toEqual([])
  })

  it('refuses through the hook, on create and update alike', () => {
    const hook = checkAttribution(() => outlet)
    expect(() => call(hook, { data: capture })).toThrow()
    expect(() =>
      call(hook, { data: { colourProfile: 'sRGB' }, originalDoc: printFile('someone-else') }),
    ).toThrow()
    expect(call(hook, { data: printFile(SHOP) })).toEqual(printFile(SHOP))
  })

  it('imports a batch only on the origin, and only of a brand it keeps', () => {
    expect(importRefusal(ARCHIVE, origin)).toBeNull()
    expect(importRefusal(SHOP, origin)).toBeNull()
    expect(importRefusal('stranger', origin)).toMatch(/not "stranger"/)
    expect(importRefusal(SHOP, outlet)).toMatch(/keeps no captures/)
    expect(importRefusal(ARCHIVE, null)).toMatch(/BRAND/)
  })
})

describe('what a master is never changes (findings 3, 4)', () => {
  const stored = { kind: 'capture', checksum: SHA, brand: ARCHIVE, storageKey: 'masters/w/x.cr3' }
  const update = (data: object, user: unknown = null, payloadAPI = 'REST') =>
    call(keepWhatIsFixed, {
      operation: 'update',
      data,
      originalDoc: stored,
      req: { user, payloadAPI },
    })
  const admin = { collection: 'users', roles: ['admin'] }

  it('refuses a new brand, kind or checksum to anyone, an admin and a script included', () => {
    for (const change of [{ brand: SHOP }, { kind: 'print-file' }, { checksum: 'd'.repeat(64) }]) {
      expect(() => update(change, admin)).toThrow()
      expect(() => update(change, null, 'local')).toThrow()
    }
  })

  it('freezes role and provenance for the catalogue, but lets an admin or a manager correct them', async () => {
    const freeze = Masters.hooks!.beforeChange![1]! as unknown as Hook
    const args = (user: unknown, data: object) => ({
      operation: 'update',
      data,
      originalDoc: { role: 'recto', provenance: 'photograph' },
      req: { user, payloadAPI: 'REST' },
    })
    const cataloguer = { collection: 'users', roles: ['cataloguer'] }
    expect(() => call(freeze, args(cataloguer, { provenance: 'composite' }))).toThrow()
    expect(() => call(freeze, args(cataloguer, { role: 'verso' }))).toThrow()
    expect(call(freeze, args(admin, { role: 'verso' }))).toEqual({ role: 'verso' })
  })
})

describe('a file sent to masters is never kept', () => {
  it('drops the request’s file, leaving its temporary copy to the request’s clean-up (8.3.h)', () => {
    const file = { tempFilePath: '/tmp/indies-uploads/tmp-upload', data: Buffer.alloc(0), size: 38 }
    const req = { file, files: { file } } as { file?: unknown; files: { file: unknown } }
    discardSentFile(req as never)
    expect(req.file).toBeUndefined()
    // `hooks/request-temp-files` removes every temp file it finds on `req.files` once answered.
    expect(req.files.file).toBe(file)
    expect(() => discardSentFile({ file: undefined } as never)).not.toThrow()
  })

  it('is the collection’s first hook, before any operation', () => {
    expect(Masters.hooks?.beforeOperation?.[0]).toBe(dropSentFile)
  })
})

describe('the upload step reserves intake (finding 9)', () => {
  it('never signs masters/intake/<checksum> for a work called "intake"', () => {
    const body = { kind: 'capture', checksum: SHA, extension: 'cr3', byteSize: 10 }
    expect(parseUploadRequest({ ...body, workUid: 'intake' })).toMatchObject({
      problems: [expect.stringMatching(/reserved for intake keys/)],
    })
    expect(parseUploadRequest({ ...body, workUid: 'intake-1' })).toHaveProperty('request')
  })
})
