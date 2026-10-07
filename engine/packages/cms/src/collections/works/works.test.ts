/**
 * The works collection's shape (TASKS.md 8.2.a, 8.2.d, 8.2.f): every field CONTENT-MODEL.md §1
 * names, the access each has, and the hooks every save passes — without a database (the database
 * proofs are `./works.db.test.ts`).
 */
import type { Field } from 'payload'
import { describe, expect, it } from 'vitest'

import { DRAFTED_ACCESS, publishedOrStaff } from '../../access/published'
import { stampAiDraft } from '../../ai/audit'
import { VOCABULARY_ACCESS } from '../terms/vocabulary/access'
import { stampCataloguing } from '../../hooks/work-cataloguing'
import { guardWork } from '../../hooks/work-guard'
import { invalidateWorkOnChange, invalidateWorkOnDelete } from '../../hooks/work-invalidate'
import { holdWorkReferences } from '../../hooks/work-references'
import { assignWorkUid } from '../../hooks/work-uid'
import { assignPublicId } from './public-id'
import { Works } from './index'
import { AI_DRAFTABLE_FIELDS } from './vocabulary'
import { nextPublicId } from '../../validators/work-record'

type Named = Field & { name: string; fields?: Field[]; access?: Record<string, unknown> }

/** The field at a dotted path, looking through rows (which have no name) and into groups/arrays. */
function fieldAt(fields: readonly Field[], path: string): Named | undefined {
  const [head, ...rest] = path.split('.')
  const flat = (list: readonly Field[]): Named[] =>
    list.flatMap((field) =>
      'name' in field ? [field as Named] : 'fields' in field ? flat(field.fields as Field[]) : [],
    )
  const found = flat(fields).find((field) => field.name === head)
  if (!found || rest.length === 0) return found
  return fieldAt((found.fields ?? []) as Field[], rest.join('.'))
}

/** CONTENT-MODEL.md §3's works table, field by field and part by part. */
const CONTENT_MODEL_FIELDS = [
  'publicId',
  'workUid',
  'stockNumber',
  'status',
  'location',
  'askingPrice',
  'title',
  'originalTitle',
  'objectType',
  'makers.maker',
  'makers.role',
  'makers.certainty',
  ...['date', 'firstEdition', 'dateOnPlate'].flatMap((date) =>
    ['from', 'to', 'precision', 'display'].map((part) => `${date}.${part}`),
  ),
  ...['place', 'publisher', 'sourceWork', 'edition', 'state', 'textLanguage', 'verso'].map(
    (part) => `publication.${part}`,
  ),
  ...['binding', 'pagination', 'plates', 'completeness', 'openings'].map((part) => `book.${part}`),
  'technique',
  'colour',
  'dimensions.image.height',
  'dimensions.image.width',
  'dimensions.sheet.height',
  'dimensions.sheet.width',
  'dimensions.framed.height',
  'dimensions.framed.width',
  'dimensions.framed.depth',
  'places.place',
  'places.role',
  'places.primary',
  'subjects',
  'references.citation',
  'references.note',
  'provenance.holder',
  'provenance.period',
  'provenance.note',
  'condition.grade',
  'condition.notes',
  'condition.defects',
  'condition.restoration',
  'images.media',
  'images.caption',
  'master',
  'physical.exportStatus',
  'physical.acquisition.source',
  'physical.acquisition.cost.amount',
  'physical.acquisition.cost.currency',
  'physical.acquisition.consignor',
  'physical.acquisition.date',
  'physical.coaIssued',
  ...['status', 'holder', 'licenceRef', 'territories', 'expires', 'printAllowed'].map(
    (part) => `rights.${part}`,
  ),
  'sameEdition',
  'cataloguing.status',
  'cataloguing.cataloguer',
  'cataloguing.verifiedAt',
  'cataloguing.aiDraft',
  'cataloguing.aiDraft.title.drafted',
  'cataloguing.aiDraft.title.verifiedBy',
  'cataloguing.aiDraft.title.verifiedAt',
  'cataloguing.aiDraft.description.drafted',
  'cataloguing.aiDraft.dimensions.verifiedAt',
  // CONTENT-MODEL.md's `legacy.id`: Payload 3.90 drops a field named `id` inside a group.
  'legacy.productId',
  'legacy.sku',
  'legacy.url',
  'legacy.categories',
  'seo.title',
  'seo.description',
  'seo.image',
]

/**
 * Held, with its reason: `description` is a run of C4 blocks, whose definitions are 9.3.a's — an
 * empty blocks field blanks Payload 3.90's edit view (`collections/makers`). Adding it removes it
 * from here.
 */
const HELD = ['description']

describe('the works collection (8.2.a): every field CONTENT-MODEL.md §1 names', () => {
  it.each(CONTENT_MODEL_FIELDS)('has %s', (path) => {
    expect(fieldAt(Works.fields, path), path).toBeDefined()
  })

  it('holds back only the essay, until its blocks exist (9.3)', () => {
    for (const path of HELD) expect(fieldAt(Works.fields, path)).toBeUndefined()
  })

  it('puts no money on a work but an acquisition’s private cost, and no print ceiling', () => {
    const json = JSON.stringify(Works.fields)
    for (const name of ['price', 'pricing', 'printCeiling', 'marketPrices']) {
      expect(json).not.toContain(`"name":"${name}"`)
    }
  })

  it('gives physical no defaults: the export status stays blank until the register sets it', () => {
    const physical = fieldAt(Works.fields, 'physical')!
    for (const part of ['exportStatus', 'coaIssued']) {
      expect(fieldAt([physical], `physical.${part}`)).not.toHaveProperty('defaultValue')
    }
    expect(fieldAt(Works.fields, 'date.precision')).not.toHaveProperty('defaultValue')
  })

  it('takes the grade as a term of the grade vocabulary, never a select', () => {
    expect(fieldAt(Works.fields, 'condition.grade')).toMatchObject({
      type: 'relationship',
      relationTo: 'terms',
      filterOptions: { kind: { equals: 'grade' } },
    })
  })

  it('keeps the role on the media record: an image row is the media and its caption', () => {
    const images = fieldAt(Works.fields, 'images')!
    expect((images.fields as Named[]).map((field) => field.name)).toEqual(['media', 'caption'])
  })

  it('gives every field an AI may draft its own entry: drafted, verified, verifiedBy, verifiedAt (3.2.c, 8.3)', () => {
    const group = fieldAt(Works.fields, 'cataloguing.aiDraft')!
    expect((group.fields as Named[]).map((field) => field.name)).toEqual([...AI_DRAFTABLE_FIELDS])
    for (const entry of group.fields as Named[]) {
      expect((entry.fields as Named[]).map((field) => field.name)).toEqual([
        'drafted',
        'verified',
        'verifiedBy',
        'verifiedAt',
      ])
    }
  })

  it('answers available until staff say otherwise, and sits nowhere until told', () => {
    expect(fieldAt(Works.fields, 'status')).toMatchObject({
      defaultValue: 'available',
      type: 'select',
    })
    expect(fieldAt(Works.fields, 'location')).toMatchObject({ type: 'select' })
    expect(fieldAt(Works.fields, 'location')).not.toHaveProperty('defaultValue')
  })
})

describe('access (8.2.d)', () => {
  const read = (field: string, user: unknown) =>
    (fieldAt(Works.fields, field)!.access!.read as (a: unknown) => boolean)({ req: { user } })
  const staff = (role: string) => ({ collection: 'users', role, store: 1 })
  const as = (user: unknown) => ({ req: { user } }) as never

  it('reads published works to the public, drafts to the owner and editors, nothing to stores', () => {
    expect(Works.access).toBe(VOCABULARY_ACCESS)
    const readWorks = Works.access!.read!
    expect(readWorks(as(null))).toEqual(publishedOrStaff(as(null)))
    expect(readWorks(as(staff('editor')))).toBe(true)
    expect(readWorks(as(staff('store')))).toBe(false)
    expect(Works.access!.readVersions!(as(staff('owner')))).toBe(
      DRAFTED_ACCESS.readVersions(as(staff('owner'))),
    )
    expect(Works.versions).toMatchObject({ drafts: { validate: true } })
  })

  it('shows physical to the owner and the editors — never the public or store staff', () => {
    for (const role of ['owner', 'editor']) expect(read('physical', staff(role))).toBe(true)
    for (const user of [null, { collection: 'customers', role: 'owner' }, staff('store')]) {
      expect(read('physical', user)).toBe(false)
    }
  })

  it('shows an acquisition — its source, cost and consignor — to the owner alone', () => {
    const acquisition = (user: unknown) =>
      (fieldAt(Works.fields, 'physical.acquisition')!.access!.read as (a: unknown) => boolean)({
        req: { user },
      })
    expect(acquisition(staff('owner'))).toBe(true)
    expect(acquisition(staff('editor'))).toBe(false)
    expect(acquisition(staff('store'))).toBe(false)
  })

  it('shows the asking price to the owner alone, to read and to write (Q14)', () => {
    const asking = fieldAt(Works.fields, 'askingPrice')!.access!
    for (const key of ['read', 'update', 'create'] as const) {
      const access = asking[key] as (a: unknown) => boolean
      expect(access({ req: { user: staff('owner') } })).toBe(true)
      for (const user of [
        null,
        { collection: 'customers', role: 'owner' },
        staff('editor'),
        staff('store'),
      ]) {
        expect(access({ req: { user } })).toBe(false)
      }
    }
  })

  it('keeps cataloguing, legacy and the master to staff', () => {
    for (const field of ['cataloguing', 'legacy', 'master']) {
      expect(read(field, null)).toBe(false)
      expect(read(field, staff('editor'))).toBe(true)
    }
  })
})

describe('the public id (3.2.b): the next number, never below the floor', () => {
  it('starts at 100000 on an empty catalogue, and never looks back', () => {
    expect(nextPublicId(null)).toBe(100_000)
    expect(nextPublicId(0)).toBe(100_000)
    expect(nextPublicId(99_999)).toBe(100_000)
    expect(nextPublicId(100_000)).toBe(100_001)
    expect(nextPublicId(123_456)).toBe(123_457)
  })

  it('refuses to follow a number that is not an id', () => {
    expect(() => nextPublicId(-1)).toThrow(/public id/)
    expect(() => nextPublicId(1.5)).toThrow(/public id/)
  })
})

describe('every save passes the same hooks, on every write path', () => {
  it('runs the guards before the save and invalidates after it', () => {
    expect(Works.hooks?.beforeChange).toEqual([
      holdWorkReferences,
      assignWorkUid,
      assignPublicId,
      // 8.3: who verified each AI-drafted field, stamped before the guards read it.
      stampAiDraft,
      stampCataloguing,
      guardWork,
    ])
    expect(Works.hooks?.afterChange).toEqual([invalidateWorkOnChange])
    expect(Works.hooks?.afterDelete).toEqual([invalidateWorkOnDelete])
  })
})
