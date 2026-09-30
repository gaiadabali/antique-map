/**
 * The versioned URL the shell links, the reader behind it, and the route wrapper (TASKS.md 4.1.f;
 * senior-be #8, #9, #15; senior-fe #11).
 */
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, truncateSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { BRAND_ASSET_URL } from '../manifest'
import { BRAND_ASSET_MAX_BYTES, readAsset } from './read'
import { GET } from './route'
import { serveBrandAsset } from './serve'
import { brandAssetUrl, versionedBrandAssetUrl } from './version'

let assets: string
const sha8 = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 8)

beforeAll(() => {
  const root = mkdtempSync(join(tmpdir(), 'brand-asset-urls-'))
  assets = join(root, 'site', 'assets')
  mkdirSync(join(assets, 'fonts'), { recursive: true })
  writeFileSync(join(assets, 'logo.svg'), '<svg/>')
  writeFileSync(join(assets, 'favicon.ico'), 'ico')
  writeFileSync(join(assets, 'fonts', 'Display Face.woff2'), 'woff2')
})

afterAll(() => rmSync(join(assets, '..', '..'), { recursive: true, force: true }))
afterEach(() => vi.unstubAllEnvs())

const serve = (path: string, v?: string) =>
  serveBrandAsset({
    assetsDir: assets,
    segments: path.split('/'),
    url: new URL(`http://localhost/brand-assets/x${v ? `?v=${v}` : ''}`),
    headers: new Headers(),
  })

describe('versionedBrandAssetUrl() and brandAssetUrl()', () => {
  it('mint ?v= from the first 8 hex digits of the SHA-256', () => {
    expect(brandAssetUrl(assets, 'logo.svg')).toBe(`/brand-assets/logo.svg?v=${sha8('<svg/>')}`)
  })

  it('answer null — and the bare URL — for a file the brand has not shipped', () => {
    expect(versionedBrandAssetUrl(assets, 'og.png')).toBeNull()
    expect(brandAssetUrl(assets, 'og.png')).toBe('/brand-assets/og.png')
  })

  it('write each segment in encodeURIComponent’s one spelling', () => {
    expect(brandAssetUrl(assets, 'fonts/Display Face.woff2')).toBe(
      `/brand-assets/fonts/Display%20Face.woff2?v=${sha8('woff2')}`,
    )
  })

  it('mint once per process; a file replaced in place is served, never pinned under the old v', async () => {
    const before = brandAssetUrl(assets, 'favicon.ico')
    writeFileSync(join(assets, 'favicon.ico'), 'ico, redrawn and longer')
    expect(brandAssetUrl(assets, 'favicon.ico')).toBe(before) // no filesystem work per render
    const stale = serve('favicon.ico', before.split('v=')[1])
    expect(stale.headers.get('cache-control')).toBe(BRAND_ASSET_URL.cacheControl.unversioned)
    expect(await stale.text()).toBe('ico, redrawn and longer')
    const fresh = serve('favicon.ico', sha8('ico, redrawn and longer'))
    expect(fresh.headers.get('cache-control')).toBe(BRAND_ASSET_URL.cacheControl.versioned)
  })
})

describe('readAsset()', () => {
  it('reads nothing that is not there, or not a file — a 404, never a throw', () => {
    expect(readAsset(join(assets, 'gone.svg'))).toBeNull()
    expect(readAsset(join(assets, 'fonts'))).toBeNull()
  })

  it('refuses a file over the cap, and the route answers 404', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const big = join(assets, 'master.png')
    writeFileSync(big, '')
    truncateSync(big, BRAND_ASSET_MAX_BYTES + 1)
    expect(readAsset(big)).toBeNull()
    expect(serve('master.png').status).toBe(404)
    expect(warn).toHaveBeenCalledTimes(1) // logged once per file, not per request
    warn.mockRestore()
  })

  it('keeps one entry per file, so repeated reads share one body', () => {
    const file = join(assets, 'logo.svg')
    expect(readAsset(file)?.body).toBe(readAsset(file)?.body)
  })
})

describe('GET, the route wrapper', () => {
  it('answers 404 when the process has no brand', async () => {
    vi.stubEnv('BRAND', '')
    const response = await GET(new Request('http://localhost/brand-assets/logo.svg'), {
      params: Promise.resolve({ path: ['logo.svg'] }),
    })
    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})
