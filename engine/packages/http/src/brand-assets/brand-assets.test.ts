/**
 * `/brand-assets/…` (C13 `BRAND_ASSET_URL`, TASKS.md 4.1.f): only C1's types, each with its type,
 * `nosniff`, an SVG sandboxed, nothing outside the folder — nor a link inside it to what the URL
 * could not name — and `immutable` only at the current version.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { BRAND_ASSET_URL } from '../manifest'
import { serveBrandAsset, SVG_POLICY } from './serve'

let root: string
let assets: string
const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
const sha = (text: string) => createHash('sha256').update(text).digest('hex')

/**
 * Whether this host lets an unprivileged process make a file symlink (Windows without Developer
 * Mode does not; Linux, and so CI, does). Only the one case that needs a file link depends on it.
 */
function canLinkFiles(): boolean {
  const probe = join(tmpdir(), `brand-assets-link-${process.pid}.png`)
  try {
    symlinkSync(probe, probe, 'file')
    unlinkSync(probe)
    return true
  } catch {
    return false
  }
}
const FILE_LINKS = canLinkFiles()

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'brand-assets-'))
  assets = join(root, 'site', 'assets')
  mkdirSync(join(assets, 'fonts'), { recursive: true })
  mkdirSync(join(assets, '.private'))
  mkdirSync(join(root, 'outside'))
  writeFileSync(join(assets, 'logo.svg'), SVG)
  writeFileSync(join(assets, 'favicon.ico'), 'ico')
  writeFileSync(join(assets, 'site.webmanifest'), '{"name":"x"}')
  writeFileSync(join(assets, 'fonts', 'display.woff2'), 'woff2')
  writeFileSync(join(assets, 'notes.txt'), 'not an asset type')
  writeFileSync(join(assets, '.env'), 'SECRET=1')
  writeFileSync(join(assets, '.hidden.svg'), SVG)
  writeFileSync(join(assets, '.private', 'p.png'), 'PRIVATE')
  writeFileSync(join(root, 'outside', 'secret.svg'), SVG)
  writeFileSync(join(root, 'site', 'brand.config.json'), '{}')
  // Folder links: a junction needs no privilege on Windows, and is a symlink elsewhere.
  symlinkSync(join(root, 'outside'), join(assets, 'out'), 'junction')
  symlinkSync(join(assets, '.private'), join(assets, 'pub'), 'junction') // inside, to a hidden folder
  if (FILE_LINKS) {
    symlinkSync(join(assets, 'notes.txt'), join(assets, 'notes.png'), 'file') // another type
    symlinkSync(join(assets, '.env'), join(assets, 'env.png'), 'file') // a dotfile
  }
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
    expect(Number(response.headers.get('content-length'))).toBe(
      (await response.arrayBuffer()).byteLength,
    )
  })

  it('serves an SVG sandboxed: no script, no load, its own styles, an opaque origin', () => {
    expect(SVG_POLICY).toBe("default-src 'none'; style-src 'unsafe-inline'; sandbox")
    expect(get('logo.svg').headers.get('content-security-policy')).toBe(SVG_POLICY)
    expect(get('favicon.ico').headers.get('content-security-policy')).toBeNull()
  })

  it.each([
    ['a type C1 does not list', 'notes.txt'],
    ['a missing file', 'nothing.svg'],
    ['a folder', 'fonts'],
    ['a dotfile', '.hidden.svg'],
    ['a file in a hidden folder', '.private/p.png'],
    ['a link inside the folder to a hidden folder', 'pub/p.png'],
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

  // Only these two need a file link, which this host may not allow an unprivileged process to make.
  it.runIf(FILE_LINKS).each([
    ['a link to a file of another type', 'notes.png'],
    ['a link to a dotfile', 'env.png'],
  ])('answers 404 for %s', (_, path) => {
    expect(get(path).status).toBe(404)
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
    'answers 304 to If-None-Match %s, with its validators and no body',
    async (tag) => {
      const response = get('logo.svg', { 'if-none-match': tag })
      expect(response.status).toBe(304)
      expect(response.headers.get('etag')).toBe(`"${sha(SVG)}"`)
      expect(response.headers.get('cache-control')).toBe(BRAND_ASSET_URL.cacheControl.unversioned)
      expect(response.headers.get('x-content-type-options')).toBe('nosniff')
      expect(response.headers.get('content-length')).toBeNull()
      expect(await response.text()).toBe('')
    },
  )

  it('answers 200 to an ETag that is not the file’s', () => {
    expect(get('logo.svg', { 'if-none-match': '"stale"' }).status).toBe(200)
  })
})
