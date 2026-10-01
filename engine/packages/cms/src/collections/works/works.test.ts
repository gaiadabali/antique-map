/**
 * The works collection's shape (TASKS.md 8.2.a, 8.2.d, 8.2.f): every field CONTENT-MODEL.md §1
 * names, the access each has, and the hooks every save passes — without a database (the database
 * proofs are `./works.db.test.ts`).
 */
import type { Field } from 'payload'
import { describe, expect, it } from 'vitest'

import { DRAFTED_ACCESS, publishedOrStaff } from '../../access/published'
import { stampCataloguing } from '../../hooks/work-cataloguing'
import { guardWork } from '../../hooks/work-guard'
import { invalidateWorkOnChange, invalidateWorkOnDelete } from '../../hooks/work-invalidate'
import { holdWorkReferences } from '../../hooks/work-references'
import { keepSyncedFields } from '../../hooks/work-synced'
import { assignWorkUid } from '../../hooks/work-uid'
import { refuseContributorPublish } from './access'
import { Works } from './index'

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

/** CONTENT-MODEL.md §1's works table, field by field and part by part. */
const CONTENT_MODEL_FIELDS = [
  'workUid',
  'stockNumber',
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
  'references.source',
  'references.ref',
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
  'physical.location',
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
  'origin.brand',
  'origin.workUid',
  'origin.syncedAt',
  'cataloguing.status',
  'cataloguing.cataloguer',
  'cataloguing.verifiedAt',
  'cataloguing.aiDraft',
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

  it('gives physical no defaults: location and export status stay blank until the register sets them', () => {
    const physical = fieldAt(Works.fields, 'physical')!
    for (const part of ['location', 'exportStatus', 'coaIssued']) {
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
})

describe('access (8.2.d)', () => {
  const read = (field: string, user: unknown) =>
    (fieldAt(Works.fields, field)!.access!.read as (a: unknown) => boolean)({ req: { user } })
  const staff = (...roles: string[]) => ({ collection: 'users', roles })

  it('reads published works to the public and drafts to staff (publishedOrStaff)', () => {
    expect(Works.access?.read).toBe(publishedOrStaff)
    expect(Works.access?.readVersions).toBe(DRAFTED_ACCESS.readVersions)
    expect(Works.versions).toMatchObject({ drafts: { validate: true } })
  })

  it('shows physical to those who catalogue, sell or ship it — never the public or other staff', () => {
    for (const roles of [['admin'], ['manager'], ['cataloguer'], ['fulfilment']]) {
      expect(read('physical', staff(...roles))).toBe(true)
    }
    for (const user of [
      null,
      { collection: 'customers', roles: ['admin'] },
      staff('editor'),
      staff('analyst'),
      staff('contributor'),
    ]) {
      expect(read('physical', user)).toBe(false)
    }
  })

  it('shows an acquisition — its source, cost and consignor — to admin and manager alone', () => {
    const acquisition = (user: unknown) =>
      (fieldAt(Works.fields, 'physical.acquisition')!.access!.read as (a: unknown) => boolean)({
        req: { user },
      })
    expect(acquisition(staff('admin'))).toBe(true)
    expect(acquisition(staff('manager'))).toBe(true)
    expect(acquisition(staff('cataloguer'))).toBe(false)
    expect(acquisition(staff('fulfilment'))).toBe(false)
  })

  it('keeps cataloguing, legacy and the master to staff', () => {
    for (const field of ['cataloguing', 'legacy', 'master']) {
      expect(read(field, null)).toBe(false)
      expect(read(field, staff('contributor'))).toBe(true)
    }
  })
})

describe('every save passes the same hooks, on every write path', () => {
  it('runs the guards before the save and invalidates after it', () => {
    expect(Works.hooks?.beforeChange).toEqual([
      refuseContributorPublish,
      holdWorkReferences,
      assignWorkUid,
      keepSyncedFields,
      stampCataloguing,
      guardWork,
    ])
    expect(Works.hooks?.afterChange).toEqual([invalidateWorkOnChange])
    expect(Works.hooks?.afterDelete).toEqual([invalidateWorkOnDelete])
  })
})
