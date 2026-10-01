import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { loadBrandConfig } from '@engine/config/loader'
import { PROXY_NOT_FOUND_STATUS, PROXY_USER_AGENT } from '../manifest'
import { createProxy, proxy } from './route'

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url))
const testBrand = { BRAND: 'test', BRAND_ROOT: './test', TEST_STOREFRONT: 'gallery' }

describe('the proxy’s answer — the protocol NextResponse.rewrite()/.next() writes', () => {
  const config = loadBrandConfig({ env: testBrand, cwd: REPO_ROOT })
  const answer = (path: string, headers: Record<string, string> = {}) =>
    createProxy({ config: () => config })(
      new Request(`https://shop.example.com${path}`, { headers }),
    )

  it('a rewrite names its absolute destination and forwards every request header, the proxy’s included', () => {
    const response = answer('/category/7?s=sold', {
      cookie: 'cart=abc',
      'x-public-path': '/forged',
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'https://shop.example.com/api/x/legacy/category/7?s=sold',
    )
    expect(response.headers.get('x-middleware-next')).toBeNull()
    const forwarded = response.headers.get('x-middleware-override-headers')?.split(',') ?? []
    expect(forwarded).toEqual(expect.arrayContaining(['cookie', 'x-public-path', 'x-locale']))
    expect(response.headers.get('x-middleware-request-cookie')).toBe('cart=abc')
    expect(response.headers.get('x-middleware-request-x-public-path')).toBe('/category/7')
    expect(response.headers.get('x-middleware-request-x-locale')).toBe('en')
  })

  it('a pass-through carries x-middleware-next, and a removed header is left off the list', () => {
    const response = answer('/admin', { 'content-security-policy': 'forged' })
    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(response.headers.get('x-middleware-rewrite')).toBeNull()
    expect(response.headers.get('x-middleware-override-headers')?.split(',')).not.toContain(
      'content-security-policy',
    )
    expect(response.headers.get('x-middleware-request-accept-language')).toBe('en')
  })

  it('answers the proxy’s own not-found with PROXY_NOT_FOUND_STATUS on its rewrite (C13 v1.3)', () => {
    for (const path of [
      '/nope/deeper',
      '/en/item/1706',
      '/de/product/1726-bali',
      '/en/not-found',
    ]) {
      const response = answer(path)
      expect(response.status, path).toBe(PROXY_NOT_FOUND_STATUS)
      expect(response.headers.get('x-middleware-rewrite'), path).toBe(
        'https://shop.example.com/en/not-found',
      )
    }
  })

  it('answers every other rewrite and pass-through 200, so the status Next’s render gives stands', () => {
    for (const path of ['/product/1706-bali', '/nope', '/category/7', '/robots.txt', '/admin']) {
      expect(answer(path).status, path).toBe(200)
    }
  })

  it('forwards PROXY_USER_AGENT when the request has none or an empty one, and a client’s own as is', () => {
    for (const headers of [{}, { 'user-agent': '' }] as Record<string, string>[]) {
      const response = answer('/nope', headers)
      expect(response.headers.get('x-middleware-request-user-agent')).toBe(PROXY_USER_AGENT)
      expect(response.headers.get('x-middleware-override-headers')?.split(',')).toContain(
        'user-agent',
      )
    }
    const own = answer('/nope', { 'user-agent': 'curl/8.9.1' })
    expect(own.headers.get('x-middleware-request-user-agent')).toBe('curl/8.9.1')
  })

  it('forwards x-public-search: the item’s query on its rewrite, "" on every other request', () => {
    const forged = { 'x-public-search': '?token=forged' }
    const search = (path: string) =>
      answer(path, forged).headers.get('x-middleware-request-x-public-search')
    expect(search('/product/1706-old?utm_source=mail')).toBe('?utm_source=mail')
    expect(search('/product/1706-bali')).toBe('')
    for (const path of ['/pay/abc?t=secret', '/old-maps?page=2', '/nope?q=1', '/admin?x=1']) {
      expect(search(path), path).toBe('')
    }
  })
})

describe('the proxy never touches the database', () => {
  /** `@engine/config/<entry>` → its source file, through the package's own exports map. */
  const configDir = join(REPO_ROOT, 'engine', 'packages', 'config')
  const configExports = (
    JSON.parse(readFileSync(join(configDir, 'package.json'), 'utf8')) as {
      exports: Record<string, string>
    }
  ).exports

  /** Every module the proxy's entry reaches, followed through relative and config imports. */
  function importGraph(): { files: string[]; packages: Set<string> } {
    const files: string[] = []
    const packages = new Set<string>()
    const visit = (file: string) => {
      if (files.includes(file)) return
      files.push(file)
      const source = readFileSync(file, 'utf8')
      const statements = /(?:^|\n)\s*(?:import|export)(\s+type\b)?[^'"]*?from\s+['"]([^'"]+)['"]/g
      for (const [, typeOnly, specifier = ''] of source.matchAll(statements)) {
        if (typeOnly) continue // erased at build: never loaded at runtime
        if (!specifier.startsWith('.')) {
          packages.add(specifier)
          const entry = /^@engine\/config(\/.+)$/.exec(specifier)?.[1]
          const target = entry === undefined ? undefined : configExports[`.${entry}`]
          if (target) visit(join(configDir, target))
          continue
        }
        const base = resolve(dirname(file), specifier)
        const candidates = [`${base}.ts`, join(base, 'index.ts'), base]
        const found = candidates.find((candidate) => {
          try {
            return readFileSync(candidate) !== undefined
          } catch {
            return false
          }
        })
        if (found) visit(found)
      }
    }
    visit(fileURLToPath(new URL('./route.ts', import.meta.url)))
    return { files, packages }
  }

  it('imports no database driver, no Payload, no domain — only config, zod and node:fs/path', () => {
    const { files, packages } = importGraph()
    expect(files.length).toBeGreaterThan(5)
    const allowed = [
      '@engine/config/loader',
      '@engine/config/routes',
      '@engine/config/schema',
      'node:fs',
      'node:path',
      'zod',
    ]
    expect([...packages].filter((name) => !allowed.includes(name))).toEqual([])
    expect(packages).toContain('@engine/config/routes') // the graph really was followed…
    expect(files.some((file) => /[\\/]loader[\\/]load\.ts$/.test(file))).toBe(true) // …into the loader
    const driver =
      /\b(?:from|import|require)\s*\(?\s*['"](?:payload|@payloadcms\/|pg|postgres|drizzle)/
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(driver) // no import of a database or the CMS, dynamic included
      expect(source, file).not.toMatch(/\bDATABASE_URL\b/) // no connection string read, however spelt
    }
    // The checks bite: each would catch what it is for.
    expect("const pool = await import('pg')").toMatch(driver)
    expect('const url = process.env.DATABASE_URL').toMatch(/\bDATABASE_URL\b/)
  })

  it('answers with no database configured at all', () => {
    const env = process.env
    process.env = {
      ...env,
      DATABASE_URL: undefined,
      ...testBrand,
      BRAND_ROOT: join(REPO_ROOT, 'test'),
    }
    try {
      const response = proxy(new Request('https://shop.example.com/product/1706-bali'))
      expect(response.headers.get('x-middleware-rewrite')).toBe(
        'https://shop.example.com/en/item/1706-bali',
      )
    } finally {
      process.env = env
    }
  })
})
