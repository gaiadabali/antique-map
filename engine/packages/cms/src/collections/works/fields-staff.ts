/**
 * What the public never reads of a work, and what governs it (CONTENT-MODEL.md §1; COMPLIANCE.md
 * §1, §8; requirement 3.8): the object's physical record, the rights in its image, the cataloguing
 * workflow, the migration's legacy ids and the SEO overrides.
 *
 * - **`physical` has no defaults.** The export status stays blank until the owner's item register
 *   sets it; a blank one never blocks publishing (requirement 16.8). `not-applicable` (held
 *   outside Indonesia) is set explicitly, never assumed. Staff-only, narrower by part (`./access`).
 *   Its `location` relation went with the `locations` stub (TASKS.md 2.4.a); CONTENT-MODEL.md §3's
 *   `location` (Singapore or Jakarta) is TASKS.md 3.2.b's.
 * - **`rights`** decide whether a reproduction may publish (COMPLIANCE.md §8): printing is allowed
 *   only on rights that allow it, and defaults to not allowed.
 */
import { CURRENCY_CODES } from '@engine/config/constants'
import type { Field, Validate } from 'payload'

import { STAFF_ONLY_ACCESS } from '../../access/fields'
import { translationStatusField } from '../../fields/translation-status'
import { costErrors, rightsErrors, type Cost, type Rights } from '../../validators/work-record'
import { ACQUISITION_ACCESS, PHYSICAL_ACCESS } from './access'
import {
  AI_DRAFTABLE_OPTIONS,
  CATALOGUING_STATUS_OPTIONS,
  EXPORT_STATUS_OPTIONS,
  RIGHTS_STATUS_OPTIONS,
} from './vocabulary'

/** A duplicate is another object: its record, workflow and legacy ids start empty. */
const cleared = () => ({})

const rightsPart =
  (part: keyof Rights): Validate =>
  (_value, { data }) =>
    rightsErrors((data as { rights?: Rights })?.rights)[part] ?? true

const costPart =
  (part: keyof Cost): Validate =>
  (_value, { siblingData }) =>
    costErrors(siblingData as Cost)[part] ?? true

export const physicalField: Field = {
  name: 'physical',
  type: 'group',
  label: 'Physical record (staff only)',
  access: PHYSICAL_ACCESS,
  admin: {
    description:
      'From the owner’s item register. Left blank, the item still publishes: the gallery sells nothing online.',
  },
  hooks: { beforeDuplicate: [cleared] },
  fields: [
    {
      name: 'exportStatus',
      type: 'select',
      options: EXPORT_STATUS_OPTIONS,
      admin: { description: 'Never assumed: set it from the register.' },
    },
    { name: 'coaIssued', type: 'checkbox', label: 'Certificate of authenticity issued' },
    {
      name: 'acquisition',
      type: 'group',
      label: 'Acquisition (owner only)',
      access: ACQUISITION_ACCESS,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'source', type: 'text', maxLength: 200 },
            { name: 'consignor', type: 'text', maxLength: 200 },
            { name: 'date', type: 'date', admin: { date: { pickerAppearance: 'dayOnly' } } },
          ],
        },
        {
          name: 'cost',
          type: 'group',
          admin: { description: 'In the currency’s smallest unit: cents, or whole rupiah.' },
          fields: [
            { name: 'amount', type: 'number', admin: { step: 1 }, validate: costPart('amount') },
            {
              name: 'currency',
              type: 'select',
              options: CURRENCY_CODES.map((code) => ({ value: code, label: code })),
              validate: costPart('currency'),
            },
          ],
        },
      ],
    },
  ],
}

export const STAFF_FIELDS: Field[] = [
  physicalField,
  {
    name: 'rights',
    type: 'group',
    // Staff only, as the header says (1.2.b: it had no access, so a public read returned it).
    access: STAFF_ONLY_ACCESS,
    admin: { description: 'Whether reproductions may be made and sold from this work.' },
    fields: [
      {
        type: 'row',
        fields: [
          { name: 'status', type: 'select', options: RIGHTS_STATUS_OPTIONS },
          { name: 'holder', type: 'text', maxLength: 200, validate: rightsPart('holder') },
          { name: 'licenceRef', type: 'text', maxLength: 120, validate: rightsPart('licenceRef') },
        ],
      },
      {
        type: 'row',
        fields: [
          {
            name: 'territories',
            type: 'text',
            hasMany: true,
            validate: rightsPart('territories'),
            admin: { description: 'Two-letter country codes, or WORLD.' },
          },
          { name: 'expires', type: 'date', admin: { date: { pickerAppearance: 'dayOnly' } } },
        ],
      },
      {
        name: 'printAllowed',
        type: 'checkbox',
        defaultValue: false,
        validate: rightsPart('printAllowed'),
        admin: { description: 'A reproduction of this work cannot publish while this is off.' },
      },
    ],
  },
  {
    name: 'cataloguing',
    type: 'group',
    access: STAFF_ONLY_ACCESS,
    hooks: { beforeDuplicate: [cleared] },
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'status',
            type: 'select',
            defaultValue: 'draft',
            options: CATALOGUING_STATUS_OPTIONS,
          },
          { name: 'cataloguer', type: 'relationship', relationTo: 'users' },
          { name: 'verifiedAt', type: 'date', admin: { readOnly: true } },
        ],
      },
      {
        name: 'aiDraft',
        type: 'select',
        hasMany: true,
        label: 'Drafted by AI, not yet checked',
        options: AI_DRAFTABLE_OPTIONS,
        admin: { description: 'The work cannot publish while any field is listed here.' },
      },
    ],
  },
  {
    name: 'legacy',
    type: 'group',
    label: 'From the old site',
    access: STAFF_ONLY_ACCESS,
    admin: { readOnly: true },
    hooks: { beforeDuplicate: [cleared] },
    fields: [
      {
        type: 'row',
        fields: [
          {
            // CONTENT-MODEL.md §1's `legacy.id`: Payload 3.90 drops a field named `id` in a group.
            name: 'productId',
            type: 'number',
            unique: true,
            index: true,
            admin: { description: 'The old site’s product id: the public id it keeps.' },
          },
          { name: 'sku', type: 'text', maxLength: 80 },
        ],
      },
      { name: 'url', type: 'text', maxLength: 2048 },
      { name: 'categories', type: 'text', hasMany: true },
    ],
  },
  {
    name: 'seo',
    type: 'group',
    label: 'SEO',
    fields: [
      { name: 'title', type: 'text', localized: true, maxLength: 70 },
      { name: 'description', type: 'textarea', localized: true, maxLength: 200 },
      { name: 'image', type: 'upload', relationTo: 'media' },
    ],
  },
  translationStatusField,
]
