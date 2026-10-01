/**
 * `places` — the gazetteer (TASKS.md 8.1.b; CONTENT-MODEL.md §3; ARCHITECTURE.md §8). The
 * discovery edge: historical ↔ modern names expand a search (Batavia ⇄ Jakarta, Celebes ⇄
 * Sulawesi, Iava ⇄ Java), and a hierarchy two levels deeper than any competitor's — Java ›
 * Batavia, Buitenzorg — gives the place pages (`/places/java/batavia`), the place facet's
 * roll-up and every breadcrumb (EXPERIENCE-GALLERY.md §2, §7).
 *
 * - `name` is the modern name, localised; `historicalNames[]` every other name, with its
 *   language and period (`./fields`).
 * - `parent` makes the tree: a place's gazetteer path is its ancestors' slugs, outermost first
 *   (C10). It can never be its own ancestor, on create or on re-parenting (`./ancestry`).
 * - `geo` is a point and a box in plain degrees (`./fields`).
 * - `description`, the essay of how it was mapped, is a run of C4 blocks and lands with them
 *   (TASKS.md 9.3.a), as `makers.bio` does — `../makers` says why there is no placeholder.
 * - The slug and translation status are the shared `fields/`; drafts, access and versions the
 *   vocabulary's own (`../terms/vocabulary/access`).
 */
import type { CollectionConfig } from 'payload'

import {
  refuseContributorPublish,
  VOCABULARY_ACCESS,
  VOCABULARY_VERSIONS,
} from '../terms/vocabulary/access'
import { slugField } from '../../fields/slug'
import { translationStatusField } from '../../fields/translation-status'
import { IN_DEFAULT_LOCALE_NOTE, requiredInDefaultLocale } from '../../fields/validate'
import { guardAncestry, keepChildrenAttached } from './ancestry'
import { geoField, historicalNamesField } from './fields'
import { PLACE_TYPE_LABELS, PLACE_TYPES } from './place-types'

export const Places: CollectionConfig = {
  slug: 'places',
  labels: { singular: 'Place', plural: 'Places' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'parent', '_status', 'updatedAt'],
    listSearchableFields: ['name', 'slug', 'historicalNames.name'],
  },
  access: VOCABULARY_ACCESS,
  versions: VOCABULARY_VERSIONS,
  hooks: {
    beforeChange: [refuseContributorPublish, guardAncestry],
    beforeDelete: [keepChildrenAttached],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      localized: true,
      maxLength: 160,
      validate: requiredInDefaultLocale('Give the place’s modern name, such as "Jakarta".'),
      admin: {
        description: `The modern name, in each language: Jakarta, Sulawesi, Maluku. ${IN_DEFAULT_LOCALE_NOTE}`,
      },
    },
    slugField({ from: 'name' }),
    historicalNamesField,
    {
      name: 'type',
      type: 'select',
      options: PLACE_TYPES.map((value) => ({ value, label: PLACE_TYPE_LABELS[value] })),
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'places',
      index: true,
      // The admin never offers the place itself; the hook refuses it, and any descendant, anyway.
      filterOptions: ({ id }) =>
        id === undefined || id === null ? true : { id: { not_equals: id } },
      admin: {
        description:
          'The place it lies in: Batavia lies in Java. Leave empty for a top-level place.',
      },
    },
    {
      name: 'children',
      type: 'join',
      collection: 'places',
      on: 'parent',
      defaultLimit: 50,
      admin: { description: 'The places that lie in this one.' },
    },
    geoField,
    translationStatusField,
  ],
}
