/**
 * Every admin label and description in registered collections and globals must be bilingual:
 * either `{ en: string; id: string }` or a `labels` block with `singular` and `plural` in that
 * shape. Plain strings are not allowed in the admin because the CMS serves both languages.
 *
 * `FULLY_LABELLED` collections must also give **every** field its own label: Payload falls back
 * to the field's name, title-cased, in English only, and a slug like `stockNumber` reads oddly as
 * a fallback title anyway. Other collections keep that fallback until their owner gives every
 * field a label too (TASKS.md 3.6.d's D4 covers `works`; widen this set as others catch up).
 *
 * This test walks the static config; no database is needed.
 */
import type { CollectionConfig, Field, GlobalConfig } from 'payload'

import { describe, expect, it } from 'vitest'

import { registeredCollections, registeredGlobals } from '../registries/collections'

type Labelish = { en: string; id: string } | string | null | undefined

type LabelsBlock = { singular: Labelish; plural: Labelish }

/** Collections audited field by field; see the file header. */
const FULLY_LABELLED = new Set(['orders', 'products', 'stock-levels', 'works', 'media', 'terms'])

/**
 * `translationStatus` and `slug` are each one field, declared once (`fields/translation-status.ts`,
 * `fields/slug.ts` — not a collection folder) and reused by several collections. Neither has a
 * label of its own yet; fixing them is outside every collection's owned paths, so they are
 * reported, not fixed, here.
 */
const SHARED_FIELD_EXEMPTIONS = new Set(['translationStatus', 'slug'])

function assertBilingual(
  errors: string[],
  path: string,
  value: Labelish | LabelsBlock,
):
  | { en: string; id: string }
  | { singular: { en: string; id: string }; plural: { en: string; id: string } }
  | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') {
    errors.push(`${path} is a plain string: ${JSON.stringify(value)}`)
    return undefined
  }
  if ('singular' in value && 'plural' in value) {
    const singular = assertBilingual(errors, `${path}.singular`, value.singular)
    const plural = assertBilingual(errors, `${path}.plural`, value.plural)
    if (
      singular &&
      plural &&
      typeof singular === 'object' &&
      'en' in singular &&
      typeof plural === 'object' &&
      'en' in plural
    ) {
      return { singular, plural }
    }
    return undefined
  }
  if (
    typeof value === 'object' &&
    'en' in value &&
    'id' in value &&
    typeof (value as { en: unknown }).en === 'string' &&
    typeof (value as { id: unknown }).id === 'string'
  ) {
    return value as { en: string; id: string }
  }
  errors.push(`${path} is not a bilingual {en, id} object: ${JSON.stringify(value)}`)
  return undefined
}

function fieldName(field: Field): string {
  if ('name' in field && typeof field.name === 'string') return field.name
  if ('type' in field && field.type === 'row') return '(row)'
  return '(anon)'
}

function visitField(errors: string[], path: string, field: Field, requireLabel: boolean): void {
  const name = fieldName(field)
  const here = `${path}.${name}`
  const hasLabel = 'label' in field && field.label !== undefined
  const hasLabels = 'labels' in field && field.labels !== undefined

  if (hasLabel) assertBilingual(errors, `${here}.label`, field.label as Labelish)
  if (hasLabels) assertBilingual(errors, `${here}.labels`, field.labels as LabelsBlock)
  if (
    requireLabel &&
    name !== '(row)' &&
    name !== '(anon)' &&
    !SHARED_FIELD_EXEMPTIONS.has(name) &&
    !hasLabel &&
    !hasLabels
  ) {
    errors.push(`${here} has no label: Payload would show the field name, in English only`)
  }
  if (field.admin) {
    if ('description' in field.admin && field.admin.description !== undefined) {
      assertBilingual(errors, `${here}.admin.description`, field.admin.description as Labelish)
    }
  }

  if ('fields' in field && Array.isArray(field.fields)) {
    for (const child of field.fields as Field[]) visitField(errors, here, child, requireLabel)
  }
}

function visitConfig(
  errors: string[],
  kind: 'collection' | 'global',
  config: CollectionConfig | GlobalConfig,
): void {
  const base = `${kind}.${config.slug}`
  const requireLabel = kind === 'collection' && FULLY_LABELLED.has(config.slug)

  if ('labels' in config && config.labels) {
    assertBilingual(errors, `${base}.labels`, config.labels as LabelsBlock)
  }
  if ('label' in config && config.label) {
    assertBilingual(errors, `${base}.label`, config.label as Labelish)
  }
  if (config.admin) {
    if (config.admin.description) {
      assertBilingual(errors, `${base}.admin.description`, config.admin.description as Labelish)
    }
    if (config.admin.group) {
      assertBilingual(errors, `${base}.admin.group`, config.admin.group as Labelish)
    }
  }

  for (const field of config.fields ?? []) visitField(errors, base, field, requireLabel)
}

describe('admin labels and descriptions are bilingual', () => {
  it('checks every registered collection', () => {
    const errors: string[] = []
    for (const collection of registeredCollections()) visitConfig(errors, 'collection', collection)
    expect(errors).toEqual([])
  })

  it('checks every registered global', () => {
    const errors: string[] = []
    for (const global of registeredGlobals()) visitConfig(errors, 'global', global)
    expect(errors).toEqual([])
  })
})
