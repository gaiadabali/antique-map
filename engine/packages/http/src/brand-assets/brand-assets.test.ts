/**
 * `/brand-assets/…` (C13 `BRAND_ASSET_URL`, TASKS.md 4.1.f): only C1's types, each with its type,
 * `nosniff`, an SVG sandboxed, nothing outside the folder, `immutable` only at the current version.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { BRAND_ASSET_URL } from '../manifest'
import { serveBrandAsset } from './serve'
import { brandAssetUrl } from './version'

let root: string
let assets: string
const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
const sha = (text: string) => createHash('sha256').update(text).digest('hex')

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'brand-assets-'))
  assets = join(root, 'site', 'assets')
  mkdirSync(join(assets, 'fonts'), { recursive: true })
  mkdirSync(join(root, 'outside'))
  writeFileSync(join(assets, 'logo.svg'), SVG)
  writeFileSync(join(assets, 'favicon.ico'), 'ico')
  writeFileSync(join(assets, 'site.webmanifest'), '{"name":"x"}')
  writeFileSync(join(assets, 'fonts', 'display.woff2'), 'woff2')
  writeFileSync(join(assets, 'notes.txt'), 'not an asset type')
  writeFileSync(join(assets, '.hidden.svg'), SVG)
  writeFileSync(join(root, 'outside', 'secret.svg'), SVG)
  writeFileSync(join(root, 'site', 'brand.config.json'), '{}')
  // A folder link out of the assets: a junction needs no privilege on Windows, a symlink elsewhere.
  symlinkSync(join(root, 'outside'), join(assets, 'out'), 'junction')
})

afterAll(() => rmSync(root, { recursive: true, force: true }))

/**
 * The segments as Next's `[...path]` hands them — each decoded once — taken from the path as
 * written: a URL parser would already have removed a `..` that a raw request can still carry.
 */
function get(path: string, headers: Record<string, string> = {}) {
  const [pathPart = '', query = ''] = path.split('?')
  const segments = pathPart.split('/').map(decodeURIComponent)
  const url = new URL(`http://localhost${BRAND_ASSET_URL.path}x${query ? `?${query}` : ''}`)
  return serveBrandAsset({ assetsDir: assets, segments, url, headers: new Headers(headers) })
}

describe('what the route serves', () => {
  it.each([
    ['logo.svg', 'image/svg+xml'],
    ['favicon.ico', 'image/x-icon'],
    ['site.webmanifest', 'application/manifest+json'],
    ['fonts/display.woff2', 'font/woff2'],
  ])('%s as %s, with nosniff', async (path, type) => {
    const response = get(path)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe(type)
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('serves an SVG under default-src none, so a script in it never runs', () => {
    expect(get('logo.svg').headers.get('content-security-policy')).toBe("default-src 'none'")
    expect(get('favicon.ico').headers.get('content-security-policy')).toBeNull()
  })

  it.each([
    ['a type C1 does not list', 'notes.txt'],
    ['a missing file', 'nothing.svg'],
    ['a folder', 'fonts'],
    ['a dotfile', '.hidden.svg'],
    ['a parent segment', '../brand.config.json'],
    ['an encoded parent segment', '%2E%2E/brand.config.json'],
    ['a dot segment', './logo.svg'],
    ['an empty segment', 'fonts//display.woff2'],
    ['a backslash', 'fonts%5Cdisplay.woff2'],
    ['a drive letter', 'C:%5CWindows%5Cwin.ini'],
    ['a NUL', 'logo.svg%00.png'],
    ['an absolute path as a segment', '%2Fetc%2Fpasswd.svg'],
    ['a link out of the folder', 'out/secret.svg'],
  ])('answers 404 for %s', (_, path) => {
    const response = get(path)
    expect(response.status).toBe(404)
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})

describe('how it is cached (C13 BRAND_ASSET_URL)', () => {
  const version = sha(SVG).slice(0, BRAND_ASSET_URL.version.hexDigits)

  it('is immutable for a year only at the current version', () => {
    const response = get(`logo.svg?v=${version}`)
    expect(response.headers.get('cache-control')).toBe(BRAND_ASSET_URL.cacheControl.versioned)
  })

  it.each([
    ['no version', 'logo.svg'],
    ['a stale version', 'logo.svg?v=00000000'],
  ])('with %s: five minutes and a strong ETag', (_, path) => {
    const response = get(path)
    expect(response.headers.get('cache-control')).toBe(BRAND_ASSET_URL.cacheControl.unversioned)
    expect(response.headers.get('etag')).toBe(`"${sha(SVG)}"`)
  })

  it.each([`"${sha(SVG)}"`, `W/"${sha(SVG)}"`, `"other", "${sha(SVG)}"`, '*'])(
    'answers 304 to If-None-Match %s',
    async (tag) => {
      const response = get('logo.svg', { 'if-none-match': tag })
      expect(response.status).toBe(304)
      expect(await response.text()).toBe('')
    },
  )

  it('answers 200 to an ETag that is not the file’s', () => {
    expect(get('logo.svg', { 'if-none-match': '"stale"' }).status).toBe(200)
  })
})

describe('brandAssetUrl() — the versioned URL the shell links', () => {
  it('mints ?v= from the first 8 hex digits of the SHA-256', () => {
    expect(brandAssetUrl(assets, 'logo.svg')).toBe(
      `/brand-assets/logo.svg?v=${sha(SVG).slice(0, 8)}`,
    )
  })

  it('gives the bare URL for a file the brand has not shipped', () => {
    expect(brandAssetUrl(assets, 'og.png')).toBe('/brand-assets/og.png')
  })

  it('follows a file replaced in place', () => {
    writeFileSync(join(assets, 'favicon.ico'), 'ico, redrawn and longer')
    expect(brandAssetUrl(assets, 'favicon.ico')).toBe(
      `/brand-assets/favicon.ico?v=${sha('ico, redrawn and longer').slice(0, 8)}`,
    )
  })

  it('writes each segment in encodeURIComponent’s one spelling', () => {
    expect(brandAssetUrl(assets, 'fonts/Display Face.woff2')).toBe(
      '/brand-assets/fonts/Display%20Face.woff2',
    )
  })
})
