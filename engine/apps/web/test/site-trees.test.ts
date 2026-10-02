/**
 * The app's shape for two sites (ARCHITECTURE.md §4, §6; TASKS.md 2.2.b): each site has its own
 * tree under its internal prefix, with a root layout that carries the one segment config
 * (`instant = false`) and lists its locales; nothing else carries any; the proxy's matcher is the
 * manifest's; and each site's home reads its own words, in both languages.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { SITE_KEYS, SITES } from '@engine/config/sites'
import { PROXY_MATCHER } from '@engine/http/manifest'
import { describe, expect, it } from 'vitest'

import { SITE_COPY } from '../src/shell/copy'
import { SHELL_MESSAGES, siteMessages } from '../src/shell/messages'

const SRC = fileURLToPath(new URL('../src/', import.meta.url))
const read = (path: string) => readFileSync(join(SRC, path), 'utf8')

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

describe('each site has its own tree', () => {
  it.each(SITE_KEYS)('%s: a root layout, a home, a designed 404 and a catch-all', (site) => {
    const tree = `app/(${site})/${site}/[locale]`
    for (const file of ['layout.tsx', 'page.tsx', 'not-found.tsx', 'not-found/page.tsx']) {
      expect(() => read(`${tree}/${file}`), file).not.toThrow()
    }
    expect(() => read(`${tree}/[...missing]/page.tsx`)).not.toThrow()
    const layout = read(`${tree}/layout.tsx`)
    expect(layout).toMatch(/^export const instant = false$/m)
    expect(layout).toContain('generateStaticParams')
    expect(layout).toContain(`site="${site}"`)
  })

  it('carries no route segment config but the root layouts’ instant = false', () => {
    const SEGMENT_CONFIG =
      /^export const (?:dynamic|revalidate|fetchCache|runtime|preferredRegion|maxDuration|dynamicParams|instant)\b/m
    const configured = files(join(SRC, 'app'))
      .filter((path) => SEGMENT_CONFIG.test(readFileSync(path, 'utf8')))
      .map((path) => relative(SRC, path).split('\\').join('/'))
      .sort()
    expect(configured).toEqual(SITE_KEYS.map((site) => `app/(${site})/${site}/[locale]/layout.tsx`))
  })

  it('declares the manifest’s proxy matcher, copied literally', () => {
    const matcher = /matcher: \[(.+)\]/.exec(read('proxy.ts'))?.[1]
    expect(matcher).toBe(PROXY_MATCHER.map((each) => `'${each}'`).join(', '))
  })
})

describe('each site’s home in English and Indonesian', () => {
  it('has every shell word in both languages of both sites, none falling back', () => {
    for (const site of SITE_KEYS) {
      for (const locale of SITES[site].locales.supported) {
        expect(siteMessages(site, locale).missing, `${site} ${locale}`).toEqual([])
      }
    }
  })

  it('reads differently per site and per language', () => {
    const lede = (site: (typeof SITE_KEYS)[number], locale: 'en' | 'id') =>
      siteMessages(site, locale).t('home.lede')
    expect(
      new Set([
        lede('gallery', 'en'),
        lede('gallery', 'id'),
        lede('shop', 'en'),
        lede('shop', 'id'),
      ]).size,
    ).toBe(4)
    expect(siteMessages('shop', 'id').t('home.title', { brand: SITES.shop.name })).toBe(
      'Old East Indies',
    )
  })

  it('keeps every value a placeholder fills in each site’s copy', () => {
    for (const site of SITE_KEYS) {
      for (const [locale, copy] of Object.entries(SITE_COPY[site])) {
        const values: Readonly<Record<string, string>> = copy
        for (const [key, fallback] of Object.entries(SHELL_MESSAGES)) {
          const wants = [...fallback.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
          const has = [...(values[key] ?? '').matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
          expect(has, `${site} ${locale} ${key}`).toEqual(wants)
        }
      }
    }
  })
})
