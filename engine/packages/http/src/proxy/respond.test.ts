import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { PROXY_NOT_FOUND_STATUS, PROXY_USER_AGENT } from '../manifest'
import { createProxy, proxy } from './route'

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url))
const ENV = { GALLERY_HOSTS: 'gallery.localhost', SHOP_HOSTS: 'shop.localhost' }

describe('the proxy’s answer — the protocol NextResponse.rewrite()/.next() writes', () => {
  const answer = (path: string, headers: Record<string, string> = {}, host = 'gallery.localhost') =>
    createProxy({ env: ENV })(
      new Request(`http://localhost:4230${path}`, { headers: { host, ...headers } }),
    )

  it('a rewrite names its destination on Next’s own origin, never the client’s Host', () => {
    const response = answer('/category/7?s=sold', { cookie: 'a=1', 'x-public-path': '/forged' })
    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'http://localhost:4230/api/x/legacy/category/7?s=sold',
    )
    expect(response.headers.get('x-middleware-next')).toBeNull()
    const forwarded = response.headers.get('x-middleware-override-headers')?.split(',') ?? []
    expect(forwarded).toEqual(expect.arrayContaining(['cookie', 'x-public-path', 'x-site']))
    expect(response.headers.get('x-middleware-request-cookie')).toBe('a=1')
    expect(response.headers.get('x-middleware-request-x-public-path')).toBe('/category/7')
    expect(response.headers.get('x-middleware-request-x-site')).toBe('gallery')
  })

  it('a pass-through carries x-middleware-next, and a removed header is left off the list', () => {
    const response = answer('/admin', { 'content-security-policy': 'forged' }, 'shop.localhost')
    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(response.headers.get('x-middleware-rewrite')).toBeNull()
    expect(response.headers.get('x-middleware-override-headers')?.split(',')).not.toContain(
      'content-security-policy',
    )
    expect(response.headers.get('x-middleware-request-accept-language')).toBe('en')
  })

  it('answers the site’s own not-found with PROXY_NOT_FOUND_STATUS on its rewrite', () => {
    for (const path of [
      '/nope/deeper',
      '/en/item/1706',
      '/de/product/1726-bali',
      '/en/not-found',
    ]) {
      const response = answer(path)
      expect(response.status, path).toBe(PROXY_NOT_FOUND_STATUS)
      expect(response.headers.get('x-middleware-rewrite'), path).toBe(
        'http://localhost:4230/gallery/en/not-found',
      )
    }
  })

  it('answers every other rewrite and pass-through 200, so the status Next’s render gives stands', () => {
    for (const path of ['/product/1706-bali', '/category/7', '/robots.txt', '/gallery/logo.svg']) {
      expect(answer(path).status, path).toBe(200)
    }
  })

  it('forwards PROXY_USER_AGENT when the request has none or an empty one, and a client’s own as is', () => {
    for (const headers of [{}, { 'user-agent': '' }] as Record<string, string>[]) {
      const response = answer('/nope', headers)
      expect(response.headers.get('x-middleware-request-user-agent')).toBe(PROXY_USER_AGENT)
    }
    expect(
      answer('/nope', { 'user-agent': 'curl/8.9.1' }).headers.get(
        'x-middleware-request-user-agent',
      ),
    ).toBe('curl/8.9.1')
  })

  it('answers an alias with a redirect of its own, its Location from the allow-list', () => {
    const env = { ...ENV, GALLERY_HOSTS: 'gallery.localhost,old.localhost', PORT: '4230' }
    const response = createProxy({ env })(
      new Request('http://localhost:4230/x?y=1', { headers: { host: 'old.localhost:4230' } }),
    )
    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('http://gallery.localhost:4230/x?y=1')
    expect(response.headers.get('x-middleware-rewrite')).toBeNull()
  })
})

describe('the proxy never touches the database', () => {
  const packageDir = (name: string) => join(REPO_ROOT, 'engine', 'packages', name)
  const exportsOf = (name: string) =>
    (
      JSON.parse(readFileSync(join(packageDir(name), 'package.json'), 'utf8')) as {
        exports: Record<string, string>
      }
    ).exports

  /** Every module the proxy's entry reaches, followed through relative and config imports. */
  function importGraph(): { files: string[]; packages: Set<string> } {
    const files: string[] = []
    const packages = new Set<string>()
    const configExports = exportsOf('config')
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
          if (target) visit(join(packageDir('config'), target))
          continue
        }
        const base = resolve(dirname(file), specifier)
        const found = [`${base}.ts`, join(base, 'index.ts'), base].find((candidate) => {
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

  it('imports no database driver, no Payload, no file reader and no brand — only the sites and zod', () => {
    const { files, packages } = importGraph()
    expect(files.length).toBeGreaterThan(5)
    const allowed = ['@engine/config/constants', '@engine/config/sites', 'zod']
    expect([...packages].filter((name) => !allowed.includes(name))).toEqual([])
    expect(packages).toContain('@engine/config/sites') // the graph really was followed…
    expect(files.some((file) => /[\\/]sites[\\/]hosts\.ts$/.test(file))).toBe(true) // …into hosts
    const driver =
      /\b(?:from|import|require)\s*\(?\s*['"](?:payload|@payloadcms\/|pg|postgres|drizzle|node:fs)/
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect(source, file).not.toMatch(driver)
      expect(source, file).not.toMatch(/\bDATABASE_URL\b|\bBRAND(?:_ROOT)?\b/)
    }
    expect("const pool = await import('pg')").toMatch(driver)
  })

  it('answers with no database configured at all', () => {
    const env = process.env
    process.env = { ...env, DATABASE_URL: undefined, ...ENV }
    try {
      const response = proxy(
        new Request('http://localhost:4230/product/1706-bali', {
          headers: { host: 'gallery.localhost:4230' },
        }),
      )
      expect(response.headers.get('x-middleware-rewrite')).toBe(
        'http://localhost:4230/gallery/en/item/1706-bali',
      )
    } finally {
      process.env = env
    }
  })
})
