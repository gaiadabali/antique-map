import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { checkCopy } from '../src/copy'
import { createMessages, defineMessages, pluralCategoriesOf } from '../src/index'

const defaults = defineMessages({
  'cart.items.one': '{count} item',
  'cart.items.other': '{count} items',
  'nav.browse': 'Browse',
})

let sandbox: string | undefined
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})
function copyDir(files: Record<string, unknown>): string {
  sandbox = mkdtempSync(join(tmpdir(), 'plurals-'))
  for (const [name, value] of Object.entries(files))
    writeFileSync(join(sandbox, name), JSON.stringify(value))
  return sandbox
}
const kinds = (issues: ReturnType<typeof checkCopy>) =>
  issues.map((issue) => `${issue.locale} ${issue.kind} ${issue.key}`)

describe('plural forms follow each locale’s own rules', () => {
  it('reads the categories from Intl.PluralRules', () => {
    expect(pluralCategoriesOf('id')).toEqual(['other'])
    expect([...pluralCategoriesOf('en')].sort()).toEqual(['one', 'other'])
    expect([...pluralCategoriesOf('nl')].sort()).toEqual(['one', 'other'])
  })

  it('requires only the forms a locale selects, so Indonesian needs no `one`', () => {
    const dir = copyDir({
      'id.json': { 'cart.items.other': '{count} barang', 'nav.browse': 'Jelajah' },
      'en.json': { 'cart.items.other': '{count} items', 'nav.browse': 'Browse' },
    })
    expect(kinds(checkCopy({ defaults, copyDir: dir, locales: ['id', 'en'] }))).toEqual([
      'en missing cart.items.one',
    ])
  })

  it('lets a form other than `other` carry fewer placeholders, never a foreign one', () => {
    const dir = copyDir({
      'en.json': {
        'cart.items.one': 'One item',
        'cart.items.other': 'Items',
        'nav.browse': 'Browse',
      },
      'nl.json': {
        'cart.items.one': 'Eén {stuk}',
        'cart.items.other': '{count} stuks',
        'nav.browse': 'Bladeren',
      },
    })
    const issues = checkCopy({ defaults, copyDir: dir, locales: ['en', 'nl'] })
    expect(kinds(issues)).toEqual([
      'en placeholders cart.items.other',
      'nl placeholders cart.items.one',
    ])
    expect(issues[1]?.message).toBe('nl.json "cart.items.one" must carry only from {count}')
  })

  it('refuses a form the locale never selects when the app defines none either', () => {
    const dir = copyDir({ 'en.json': { ...defaults, 'cart.items.many': '{count} items' } })
    expect(kinds(checkCopy({ defaults, copyDir: dir, locales: ['en'] }))).toEqual([
      'en unknown cart.items.many',
    ])
  })

  it('treats an empty value as absent — a gap, never a blank', () => {
    const dir = copyDir({ 'en.json': { ...defaults, 'nav.browse': '' } })
    expect(kinds(checkCopy({ defaults, copyDir: dir, locales: ['en'] }))).toEqual([
      'en missing nav.browse',
    ])
    const messages = createMessages({
      defaults,
      locale: 'id',
      defaultLocale: 'en',
      copy: { id: { 'nav.browse': '' }, en: { 'nav.browse': 'Maps & Charts' } },
    })
    expect(messages.t('nav.browse')).toBe('Maps & Charts')
    expect(messages.missing).toContain('nav.browse')
  })
})
