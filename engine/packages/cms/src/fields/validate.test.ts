/**
 * The shared field validators and the staff-only translation status (TASKS.md 8.1).
 */
import { describe, expect, it } from 'vitest'

import { translationStatusField } from './translation-status'
import {
  IN_DEFAULT_LOCALE_NOTE,
  isWebUrl,
  requiredInDefaultLocale,
  requiredToPublish,
} from './validate'

describe('shared validators', () => {
  const at = (locale: string, operation: 'create' | 'update') =>
    ({
      operation,
      req: { locale, payload: { config: { localization: { defaultLocale: 'en' } } } },
    }) as never

  it('require a name on create and in the default locale, not in a translation', () => {
    const validate = requiredInDefaultLocale('Give the name.')
    expect(validate('', at('en', 'update'))).toBe('Give the name.')
    expect(validate('', at('id', 'create'))).toBe('Give the name.')
    expect(validate('', at('id', 'update'))).toBe(true)
    expect(validate('Jawa', at('id', 'update'))).toBe(true)
  })

  it('require a field to publish, never to save a draft', () => {
    const validate = requiredToPublish('Give the citation.')
    expect(validate('', { data: { _status: 'published' } } as never)).toBe('Give the citation.')
    expect(validate('', { data: { _status: 'draft' } } as never)).toBe(true)
    expect(validate('Koeman 1967', { data: { _status: 'published' } } as never)).toBe(true)
  })

  it('say in the admin where the text is required', () => {
    expect(IN_DEFAULT_LOCALE_NOTE).toMatch(/Required in English/)
  })

  it('take only absolute web addresses', () => {
    expect(isWebUrl('https://www.wikidata.org/wiki/Q1384583')).toBe(true)
    expect(isWebUrl('http://vocab.getty.edu/page/ulan/500115589')).toBe(true)
    expect(isWebUrl('http://vocab.getty.edu/x', { httpsOnly: true })).toBe(false)
    for (const bad of ['javascript:alert(1)', '/makers/valentijn', 'wikidata', 'https://a b.c']) {
      expect(isWebUrl(bad)).toBe(false)
    }
  })
})

describe('translationStatus (senior-be review of 8.1, N3)', () => {
  const as = (user: unknown) => ({ req: { user } }) as never
  const access = translationStatusField.access!

  it('is staff-only: neither read nor written by the public or a customer', () => {
    for (const user of [null, { collection: 'customers', role: 'owner' }]) {
      expect(access.read!(as(user))).toBe(false)
      expect(access.update!(as(user))).toBe(false)
    }
    expect(access.read!(as({ collection: 'users', role: 'editor' }))).toBe(true)
  })
})
