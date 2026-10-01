// A key is a plural form only inside a real plural set (TASKS.md 6.3.j): codes spelt `other`
// (`objectType.other`, `return.reason.other`, `business.shopType.other`) are plain keys, so a
// stray `objectType.one` in a brand's copy fails the gate instead of passing as a plural form.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, expectTypeOf, it } from 'vitest'

import { checkCopy } from '../src/copy'
import { createMessages, defineMessages, pluralFormOf, type PluralBase } from '../src/index'

// The shapes the lexicon writes (engine/apps/*/src/messages/lexicon): code sets that end in
// `other`, and the real plural sets — `photosHint.one` carries no `{count}` ("One photo").
const defaults = defineMessages({
  'objectType.map': 'Map',
  'objectType.other': 'Other',
  'return.reason.damaged': 'It arrived damaged',
  'return.reason.other': 'Something else',
  'business.shopType.gallery': 'Gallery',
  'business.shopType.other': 'Other business',
  'photosHint.one': 'One photo, up to {size} MB.',
  'photosHint.other': 'Up to {count} photos, {size} MB each.',
  'listing.showResults.one': 'Show {count} result',
  'listing.showResults.other': 'Show {count} results',
  'message.available.one': '{count} available',
  'message.available.other': '{count} available',
  'message.works.one': '{count} work',
  'message.works.other': '{count} works',
})

const PLURAL_KEYS = Object.keys(defaults).filter((key) =>
  /^(photosHint|listing|message)\./.test(key),
)

let sandbox: string | undefined
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})
function copyDir(files: Record<string, unknown>): string {
  sandbox = mkdtempSync(join(tmpdir(), 'plural-sets-'))
  for (const [name, value] of Object.entries(files))
    writeFileSync(join(sandbox, name), JSON.stringify(value))
  return sandbox
}
/** The defaults as a brand's copy for `locale`, without the forms it never selects. */
function copyFor(locale: 'en' | 'nl' | 'id'): Record<string, string> {
  const values: Record<string, string> = { ...defaults }
  if (locale === 'id') for (const key of PLURAL_KEYS) if (key.endsWith('.one')) delete values[key]
  return values
}
const kinds = (issues: ReturnType<typeof checkCopy>) =>
  issues.map((issue) => `${issue.locale} ${issue.kind} ${issue.key}`)

describe('a key is a plural form only inside a plural set', () => {
  it('reads codes spelt `other` as plain keys', () => {
    for (const key of ['objectType.other', 'return.reason.other', 'business.shopType.other'])
      expect(pluralFormOf(key, defaults), key).toBeNull()
    expect(pluralFormOf('objectType.one', defaults)).toBeNull()
  })

  it('still reads every real plural set’s forms', () => {
    for (const key of PLURAL_KEYS)
      expect(pluralFormOf(key, defaults), key).toEqual({
        base: key.replace(/\.(one|other)$/, ''),
        category: key.slice(key.lastIndexOf('.') + 1),
      })
    // A form the defaults lack is still a form of a real set (a brand's `few`).
    expect(pluralFormOf('message.works.few', defaults)).toEqual({
      base: 'message.works',
      category: 'few',
    })
  })

  it('needs a sibling form and `{count}` in the `other` default, not the last segment alone', () => {
    expect(pluralFormOf('a.other', { 'a.other': '{count} things' })).toBeNull()
    expect(pluralFormOf('a.other', { 'a.one': 'One', 'a.other': 'Several' })).toBeNull()
    expect(pluralFormOf('a.one', { 'a.one': 'One', 'a.other': '{count} things' })).toEqual({
      base: 'a',
      category: 'one',
    })
  })

  it('fails a stray `objectType.one` planted in a brand’s copy', () => {
    const dir = copyDir({ 'en.json': { ...copyFor('en'), 'objectType.one': 'One' } })
    const issues = checkCopy({ defaults, copyDir: dir, locales: ['en'] })
    expect(kinds(issues)).toEqual(['en unknown objectType.one'])
    expect(issues[0]?.message).toBe('en.json has "objectType.one", which the app does not define')
  })

  it('requires `objectType.other` in every locale, Indonesian included', () => {
    const { 'objectType.other': _dropped, ...rest } = copyFor('id')
    const dir = copyDir({ 'id.json': rest })
    expect(kinds(checkCopy({ defaults, copyDir: dir, locales: ['id'] }))).toEqual([
      'id missing objectType.other',
    ])
  })

  it('passes the real plural sets across en, id and nl, as before', () => {
    const dir = copyDir({
      'en.json': copyFor('en'),
      'nl.json': copyFor('nl'),
      'id.json': copyFor('id'),
    })
    expect(checkCopy({ defaults, copyDir: dir, locales: ['en', 'nl', 'id'] })).toEqual([])
    const nl = createMessages({ defaults, locale: 'nl', defaultLocale: 'en', copy: {} })
    expect(nl.t('message.works', { count: 1 })).toBe('1 work')
    expect(nl.t('photosHint', { count: 3, size: 5 })).toBe('Up to 3 photos, 5 MB each.')
  })

  it('types `t()` with a plural base only for a real set', () => {
    type Keys = keyof typeof defaults
    expectTypeOf<PluralBase<Keys>>().toEqualTypeOf<
      'photosHint' | 'listing.showResults' | 'message.available' | 'message.works'
    >()
  })
})
