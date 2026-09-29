import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { loadBrandConfig } from '../../../config/src/loader/index'
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
})

describe('the proxy never touches the database', () => {
  /** Every module the proxy's entry reaches, followed through relative imports. */
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
      '@engine/config/routes',
      '@engine/config/schema',
      'node:fs',
      'node:path',
      'zod',
    ]
    expect([...packages].filter((name) => !allowed.includes(name))).toEqual([])
    expect(packages).toContain('@engine/config/routes') // the graph really was followed
    for (const file of files) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(
        /\b(?:payload|pg|postgres|drizzle|DATABASE_URL)\b['"]/,
      )
    }
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
