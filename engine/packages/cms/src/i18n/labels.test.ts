/**
 * Every admin label and description in registered collections and globals must be bilingual:
 * either `{ en: string; id: string }` or a `labels` block with `singular` and `plural` in that
 * shape. Plain strings are not allowed in the admin because the CMS serves both languages.
 *
 * This test walks the static config; no database is needed.
 */
import type { CollectionConfig, Field, GlobalConfig } from 'payload'

import { describe, expect, it } from 'vitest'

import { registeredCollections, registeredGlobals } from '../registries/collections'

type Labelish = { en: string; id: string } | string | null | undefined

type LabelsBlock = { singular: Labelish; plural: Labelish }

function assertBilingual(
  path: string,
  value: Labelish | LabelsBlock,
):
  | { en: string; id: string }
  | { singular: { en: string; id: string }; plural: { en: string; id: string } }
  | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') {
    expect.fail(`${path} is a plain string: ${JSON.stringify(value)}`)
  }
  if ('singular' in value && 'plural' in value) {
    const singular = assertBilingual(`${path}.singular`, value.singular)
    const plural = assertBilingual(`${path}.plural`, value.plural)
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
  expect.fail(`${path} is not a bilingual {en, id} object: ${JSON.stringify(value)}`)
}

function fieldName(field: Field): string {
  if ('name' in field && typeof field.name === 'string') return field.name
  if ('type' in field && field.type === 'row') return '(row)'
  return '(anon)'
}

function visitField(path: string, field: Field): void {
  const name = fieldName(field)
  const here = `${path}.${name}`

  if ('label' in field && field.label !== undefined) {
    assertBilingual(`${here}.label`, field.label as Labelish)
  }
  if ('labels' in field && field.labels !== undefined) {
    assertBilingual(`${here}.labels`, field.labels as LabelsBlock)
  }
  if (field.admin) {
    if ('description' in field.admin && field.admin.description !== undefined) {
      assertBilingual(`${here}.admin.description`, field.admin.description as Labelish)
    }
  }

  if ('fields' in field && Array.isArray(field.fields)) {
    for (const child of field.fields as Field[]) visitField(here, child)
  }
}

function visitConfig(kind: 'collection' | 'global', config: CollectionConfig | GlobalConfig): void {
  const base = `${kind}.${config.slug}`

  if ('labels' in config && config.labels) {
    assertBilingual(`${base}.labels`, config.labels as LabelsBlock)
  }
  if ('label' in config && config.label) {
    assertBilingual(`${base}.label`, config.label as Labelish)
  }
  if (config.admin) {
    if (config.admin.description) {
      assertBilingual(`${base}.admin.description`, config.admin.description as Labelish)
    }
    if (config.admin.group) {
      assertBilingual(`${base}.admin.group`, config.admin.group as Labelish)
    }
  }

  for (const field of config.fields ?? []) visitField(base, field)
}

describe('admin labels and descriptions are bilingual', () => {
  it('checks every registered collection', () => {
    for (const collection of registeredCollections()) visitConfig('collection', collection)
  })

  it('checks every registered global', () => {
    for (const global of registeredGlobals()) visitConfig('global', global)
  })
})
