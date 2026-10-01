import { MEDIA_PROVENANCES, MEDIA_ROLES } from '@engine/media/contract'
import { MEDIA_UPLOAD_MAX_BYTES, MEDIA_UPLOAD_MIME_TYPES } from '@engine/media/storage'
import { describe, expect, it, vi } from 'vitest'

import { STAFF_ROLES } from '../../access/roles'
import { MEDIA_ACCESS } from './access'
import { altBaseline } from './alt-baseline'
import { MEDIA_FIELDS, validateAlt } from './fields'
import {
  altInDefaultLocaleFirst,
  deriveFromFile,
  matchItsMaster,
  refuseOversizedUpload,
} from './hooks'
import { Media } from './index'
import { PROVENANCE_LABELS, ROLE_LABELS } from './options'

type Hook = (args: never) => unknown
const call = (hook: Hook, args: Record<string, unknown>) => hook(args as never)
const field = (name: string) =>
  MEDIA_FIELDS.find((f) => 'name' in f && f.name === name) as Record<string, unknown>
const staff = (...roles: string[]) => ({ collection: 'users', roles })
const access = (fn: unknown, user: unknown, extra: object = {}) =>
  (fn as (a: unknown) => unknown)({ req: { user }, ...extra })

describe('the media collection (8.3.a, 8.3.d)', () => {
  it('is an upload collection of web rasters only, with no crop, no pasted URL and no Payload sizes', () => {
    expect(Media.slug).toBe('media')
    expect(Media.upload).toMatchObject({ crop: false, focalPoint: true, pasteURL: false })
    expect((Media.upload as { mimeTypes: string[] }).mimeTypes).toEqual([
      ...MEDIA_UPLOAD_MIME_TYPES,
    ])
    expect((Media.upload as { imageSizes?: unknown }).imageSizes).toBeUndefined()
  })

  it('requires localised alt text, and refuses whitespace for it', () => {
    expect(field('alt')).toMatchObject({ type: 'text', localized: true, required: true })
    expect(validateAlt('   ', {} as never)).toMatch(/Describe the image/)
    expect(validateAlt(undefined, {} as never)).toMatch(/Describe the image/)
    expect(validateAlt('x'.repeat(501), {} as never)).toMatch(/500 characters/)
    expect(validateAlt('Engraved map of Bali, recto', {} as never)).toBe(true)
  })

  it("takes C9's roles (never `primary`) and provenances, both required, provenance with no default", () => {
    const values = (f: Record<string, unknown>) =>
      (f.options as Array<{ value: string }>).map((o) => o.value)
    expect(values(field('role'))).toEqual([...MEDIA_ROLES])
    expect(values(field('role'))).not.toContain('primary')
    expect(values(field('provenance'))).toEqual([...MEDIA_PROVENANCES])
    expect(field('role')).toMatchObject({ required: true })
    expect(field('provenance')).toMatchObject({ required: true })
    expect(field('provenance')).not.toHaveProperty('defaultValue')
    expect(MEDIA_FIELDS.some((f) => 'name' in f && f.name === 'aiGenerated')).toBe(false)
    for (const value of [...MEDIA_ROLES, 'reference']) expect(ROLE_LABELS).toHaveProperty(value)
    for (const value of MEDIA_PROVENANCES) expect(PROVENANCE_LABELS).toHaveProperty(value)
  })

  it('keeps `master` to staff, at the field', () => {
    const master = field('master') as { access: Record<string, (a: unknown) => boolean> }
    expect(master).toMatchObject({ type: 'relationship', relationTo: 'masters' })
    for (const op of ['read', 'create', 'update'] as const) {
      expect(master.access[op]!({ req: { user: staff('editor') } })).toBe(true)
      expect(master.access[op]!({ req: { user: null } })).toBe(false)
      expect(master.access[op]!({ req: { user: { collection: 'customers' } } })).toBe(false)
    }
  })
})

describe('who reaches an image and its file (8.3.g, Found 10)', () => {
  it('reads the record publicly, but serves the file — the full-resolution upload — to staff alone', () => {
    expect(access(MEDIA_ACCESS.read, null)).toBe(true)
    expect(access(MEDIA_ACCESS.read, null, { isReadingStaticFile: true })).toBe(false)
    expect(
      access(MEDIA_ACCESS.read, { collection: 'customers' }, { isReadingStaticFile: true }),
    ).toBe(false)
    expect(access(MEDIA_ACCESS.read, staff('analyst'), { isReadingStaticFile: true })).toBe(true)
  })

  it('lets staff who place images create them, and never a customer or a visitor', () => {
    for (const role of ['admin', 'manager', 'cataloguer', 'editor', 'contributor']) {
      expect(access(MEDIA_ACCESS.create, staff(role))).toBe(true)
    }
    for (const role of STAFF_ROLES.filter((r) => ['analyst', 'fulfilment'].includes(r))) {
      expect(access(MEDIA_ACCESS.create, staff(role))).toBe(false)
    }
    expect(access(MEDIA_ACCESS.create, { collection: 'customers', roles: ['admin'] })).toBe(false)
    expect(access(MEDIA_ACCESS.create, null)).toBe(false)
    expect(access(MEDIA_ACCESS.delete, staff('editor'))).toBe(false)
    expect(access(MEDIA_ACCESS.delete, staff('cataloguer'))).toBe(true)
  })
})

describe('the hooks', () => {
  it('refuses an upload over the limit with 413, on create and update alike', () => {
    const over = { req: { file: { size: MEDIA_UPLOAD_MAX_BYTES + 1 } } }
    for (const operation of ['create', 'update']) {
      expect(() => call(refuseOversizedUpload, { operation, ...over })).toThrow(
        expect.objectContaining({ status: 413 }),
      )
    }
    expect(() =>
      call(refuseOversizedUpload, {
        operation: 'create',
        req: { file: { size: MEDIA_UPLOAD_MAX_BYTES } },
      }),
    ).not.toThrow()
    expect(() => call(refuseOversizedUpload, { operation: 'read', ...over })).not.toThrow()
  })

  it('creates an image in the default locale first', () => {
    const req = (locale: string) => ({
      locale,
      payload: { config: { localization: { defaultLocale: 'en' } } },
    })
    const data = { alt: 'Peta Bali' }
    expect(call(altInDefaultLocaleFirst, { operation: 'create', data, req: req('en') })).toBe(data)
    expect(() =>
      call(altInDefaultLocaleFirst, { operation: 'create', data, req: req('id') }),
    ).toThrow()
    expect(call(altInDefaultLocaleFirst, { operation: 'update', data, req: req('id') })).toBe(data)
    const all = { alt: { en: 'Map of Bali', id: 'Peta Bali' } }
    expect(call(altInDefaultLocaleFirst, { operation: 'create', data: all, req: req('all') })).toBe(
      all,
    )
    expect(() =>
      call(altInDefaultLocaleFirst, {
        operation: 'create',
        data: { alt: { id: 'Peta' } },
        req: req('all'),
      }),
    ).toThrow(
      expect.objectContaining({
        data: expect.objectContaining({
          errors: [
            expect.objectContaining({ message: expect.stringMatching(/default language \(en\)/) }),
          ],
        }),
      }),
    )
  })

  it("derives the content address from the file, and keeps the pipeline's fields from a request", async () => {
    const file = { data: Buffer.from('hello'), size: 5 }
    const sha = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
    const fromRest = (await call(deriveFromFile, {
      data: { alt: 'x', assetId: 'forged', derivatives: { status: 'ready' } },
      req: { payloadAPI: 'REST', file },
    })) as Record<string, unknown>
    expect(fromRest).toMatchObject({
      assetId: sha.slice(0, 32),
      derivatives: { status: 'pending' },
    })
    const edit = (await call(deriveFromFile, {
      data: { alt: 'y', derivatives: { status: 'failed' } },
      originalDoc: { assetId: 'kept', derivatives: { status: 'ready' }, iiif: { status: 'ready' } },
      req: { payloadAPI: 'REST' },
    })) as Record<string, unknown>
    expect(edit).toMatchObject({
      assetId: 'kept',
      derivatives: { status: 'ready' },
      iiif: { status: 'ready' },
    })
    const job = (await call(deriveFromFile, {
      data: { derivatives: { status: 'ready', version: 'v1' } },
      originalDoc: { assetId: 'kept' },
      req: { payloadAPI: 'local' },
    })) as Record<string, unknown>
    expect(job).toMatchObject({ derivatives: { status: 'ready', version: 'v1' } })
  })

  it("holds an image's role and provenance to its master's, and its master to a capture", async () => {
    const req = (master: object | null) => ({
      payload: { findByID: vi.fn(async () => master) },
    })
    const capture = { kind: 'capture', role: 'recto', provenance: 'photograph' }
    const ok = { master: 7, role: 'recto', provenance: 'photograph' }
    expect(await call(matchItsMaster, { data: ok, req: req(capture) })).toBe(ok)
    await expect(
      call(matchItsMaster, { data: { ...ok, role: 'verso' }, req: req(capture) }),
    ).rejects.toThrow()
    await expect(
      call(matchItsMaster, { data: ok, req: req({ ...capture, kind: 'print-file' }) }),
    ).rejects.toThrow()
    await expect(call(matchItsMaster, { data: ok, req: req(null) })).rejects.toThrow()
    const unlinked = { role: 'editorial', provenance: 'ai-generated' }
    expect(await call(matchItsMaster, { data: unlinked, req: req(null) })).toBe(unlinked)
  })
})

describe('the alt baseline (8.3.f)', () => {
  const words = (label: string) =>
    label === 'ai-generated' ? 'AI-generated image' : 'Digital mockup'

  it("starts a synthetic image's with its label, in the lexicon's words, and a photograph's with none", () => {
    const description = 'Engraved map of Bali by François Valentijn, 1726, hand-coloured, recto'
    expect(altBaseline({ description, provenance: 'photograph', labelWords: words })).toBe(
      description,
    )
    expect(
      altBaseline({
        description: 'A framed print above a sofa',
        provenance: 'composite',
        labelWords: words,
      }),
    ).toBe('Digital mockup: A framed print above a sofa')
    expect(
      altBaseline({ description: 'A room', provenance: 'rendered', labelWords: words }),
    ).toMatch(/^Digital mockup/)
    expect(
      altBaseline({ description: 'A street', provenance: 'ai-generated', labelWords: words }),
    ).toMatch(/^AI-generated image: /)
  })

  it('never labels twice, and refuses an empty description or label', () => {
    const once = altBaseline({ description: 'A room', provenance: 'composite', labelWords: words })
    expect(altBaseline({ description: once, provenance: 'composite', labelWords: words })).toBe(
      once,
    )
    expect(() =>
      altBaseline({ description: ' ', provenance: 'photograph', labelWords: words }),
    ).toThrow()
    expect(() =>
      altBaseline({ description: 'x', provenance: 'composite', labelWords: () => '' }),
    ).toThrow()
  })
})
