import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { checkCopy, CopyFileError, loadMessages, readCopyFile } from '../src/copy'
import {
  defineMessages,
  localeOfPath,
  localePrefix,
  resolveLocale,
  suggestLocale,
} from '../src/index'

const brand = { locales: { default: 'en', supported: ['en', 'id'] } } as const
const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url))

describe('locales — the default unprefixed, never negotiated', () => {
  it('resolves, prefixes and reads locales from paths', () => {
    expect(resolveLocale(brand, 'id')).toBe('id')
    expect(resolveLocale(brand, 'nl')).toBe('en') // unsupported → the default
    expect(resolveLocale(brand, undefined)).toBe('en')
    expect(localePrefix(brand, 'en')).toBe('')
    expect(localePrefix(brand, 'id')).toBe('/id')
    expect(localeOfPath(brand, '/id/produk/1706-bali')).toBe('id')
    expect(localeOfPath(brand, '/product/1706-bali')).toBe('en')
    expect(localeOfPath(brand, '/en/product/1706')).toBe('en')
  })

  it('suggests a language for the banner from Accept-Language, and nothing it does not serve', () => {
    expect(suggestLocale(brand, 'id-ID,id;q=0.9,en-US;q=0.8')).toBe('id')
    expect(suggestLocale(brand, 'nl;q=1, en;q=0.5')).toBe('en')
    expect(suggestLocale(brand, 'fr, de;q=0.7')).toBeNull()
    expect(suggestLocale(brand, 'en;q=0.2, id;q=0.9')).toBe('id')
    expect(suggestLocale(brand, 'id;q=0, en;q=0.1')).toBe('en')
    expect(suggestLocale(brand, null)).toBeNull()
    expect(suggestLocale(brand, 'in-ID,in;q=0.9')).toBe('id') // ISO 639's withdrawn code for Indonesian
    expect(suggestLocale(brand, 'constructor')).toBeNull()
  })
})

let sandbox: string | undefined
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})
function copyDir(files: Record<string, unknown>): string {
  sandbox = mkdtempSync(join(tmpdir(), 'copy-'))
  for (const [name, value] of Object.entries(files)) {
    writeFileSync(join(sandbox, name), typeof value === 'string' ? value : JSON.stringify(value))
  }
  return sandbox
}

// An app's keys and its neutral defaults.
const appMessages = defineMessages({
  'nav.browse': 'Browse',
  'item.price.estimate': '≈ {estimate}, charged in {charge}',
  'cart.items.one': '{count} item',
  'cart.items.other': '{count} items',
  'footer.tagline': 'Objects with a history',
})

describe('messages — keys from the app, values from the brand’s copy', () => {
  it('reads each value from <brand>/site/copy/<locale>.json, falling back to the brand default, then the app', () => {
    const dir = copyDir({
      'en.json': { 'nav.browse': 'Maps & Charts', 'footer.tagline': 'Since 1750, more or less' },
      'id.json': {
        $comment: 'for editors',
        'nav.browse': 'Jelajah',
        'cart.items.other': '{count} barang',
      },
    })
    const id = loadMessages({
      defaults: appMessages,
      copyDir: dir,
      locale: 'id',
      defaultLocale: 'en',
    })
    expect(id.t('nav.browse')).toBe('Jelajah')
    expect(id.t('footer.tagline')).toBe('Since 1750, more or less') // the brand's default locale
    expect(id.t('item.price.estimate', { estimate: '€1.020', charge: 'US$1.100,00' })).toBe(
      '≈ €1.020, charged in US$1.100,00',
    ) // the app's neutral default
    // Indonesian selects `other` alone, so a missing `cart.items.one` is no gap in its copy.
    expect(id.missing).toEqual(['item.price.estimate', 'footer.tagline'])
    expect(id.t('cart.items', { count: 1200 })).toBe('1.200 barang') // Indonesian has no singular form
    const en = loadMessages({
      defaults: appMessages,
      copyDir: dir,
      locale: 'en',
      defaultLocale: 'en',
    })
    expect(en.t('cart.items', { count: 1 })).toBe('1 item')
    expect(en.t('cart.items', { count: 3 })).toBe('3 items')
    expect(en.t('item.price.estimate', {})).toBe('≈ {estimate}, charged in {charge}') // unfilled stays visible
  })

  it('serves the app’s defaults when the brand has no copy yet — the committed copy folders are empty', () => {
    let checked = 0
    for (const slug of readdirSync(REPO_ROOT)) {
      // brand:create's test scaffolds (and removes) a throwaway brand here while the suite runs.
      if (slug.startsWith('fixture-')) continue
      const dir = join(REPO_ROOT, slug, 'site', 'copy')
      if (!existsSync(dir)) continue
      checked += 1
      expect(readdirSync(dir).filter((file) => file.endsWith('.json'))).toEqual([])
      const messages = loadMessages({
        defaults: appMessages,
        copyDir: dir,
        locale: 'id',
        defaultLocale: 'en',
      })
      expect(messages.t('nav.browse')).toBe('Browse')
    }
    expect(checked).toBeGreaterThanOrEqual(3) // both real brands and the synthetic one
  })

  it('refuses a copy file that is not JSON, not an object, or holds a non-text value', () => {
    expect(() => readCopyFile(copyDir({ 'en.json': '{ nope' }), 'en')).toThrow(CopyFileError)
    expect(() => readCopyFile(copyDir({ 'en.json': ['a'] }), 'en')).toThrow(/must be an object/)
    expect(() => readCopyFile(copyDir({ 'en.json': { 'nav.browse': 3 } }), 'en')).toThrow(
      /"nav\.browse" must be text/,
    )
  })

  it('checkCopy() lists missing and unknown keys and placeholders that differ, per locale', () => {
    const dir = copyDir({
      'en.json': Object.fromEntries(
        Object.keys(appMessages).map((key) => [key, appMessages[key as keyof typeof appMessages]]),
      ),
      'id.json': {
        'nav.browse': 'Jelajah',
        'item.price.estimate': '≈ {perkiraan}',
        'nav.brwose': 'typo',
      },
    })
    const issues = checkCopy({ defaults: appMessages, copyDir: dir, locales: ['en', 'id'] })
    expect(issues.filter((issue) => issue.locale === 'en')).toEqual([])
    expect(issues.map((issue) => `${issue.kind} ${issue.key}`)).toEqual([
      'placeholders item.price.estimate',
      'missing cart.items.other',
      'missing footer.tagline',
      'unknown nav.brwose',
    ])
    expect(issues[0]?.message).toBe('id.json "item.price.estimate" must carry {charge} {estimate}')
  })
})
