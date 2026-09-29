// C13 v1.2 (TASKS.md 3.4.c): the home-screen icon and web manifest a browser asks for at the root
// are root files, answered by the brand-assets route rather than the designed not-found page and
// its loader (3.1 senior-fe #12); and, as the proxy applies C10 v1.2, a segment in another
// spelling is not found while a moved static page reaches the legacy handler.
import { fileURLToPath } from 'node:url'

import { loadBrandConfig } from '@engine/config/loader'
import { describe, expect, it } from 'vitest'

import { ENGINE_ROUTES, ROOT_REWRITES } from '../manifest'
import { decideProxy, type ProxyConfig } from '../proxy/route'

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url))
const gallery = loadBrandConfig({
  env: { BRAND: 'test', BRAND_ROOT: './test', TEST_STOREFRONT: 'gallery' },
  cwd: REPO_ROOT,
})
const decide = (path: string, config: ProxyConfig = gallery) =>
  decideProxy(config, { url: new URL(path, 'https://shop.example.com'), headers: new Headers() })

/** Whether a mount path serves a URL: its static head, then a catch-all (`[[...]]` takes none). */
const serves = (mount: string, url: string) => {
  const head = mount.replace(/\[.*$/, '')
  if (head === mount) return url === mount
  if (mount.includes('[[...') && url === head.replace(/\/$/, '')) return true
  return url.startsWith(head) && url.length > head.length
}

describe('C13 — ROOT_REWRITES', () => {
  it('answers the touch icons and the web manifest from the brand’s own files', () => {
    expect(ROOT_REWRITES).toEqual(
      expect.arrayContaining([
        { from: '/apple-touch-icon.png', to: '/brand-assets/apple-touch-icon.png' },
        { from: '/apple-touch-icon-precomposed.png', to: '/brand-assets/apple-touch-icon.png' },
        { from: '/site.webmanifest', to: '/brand-assets/site.webmanifest' },
      ]),
    )
    for (const [path, to] of [
      ['/apple-touch-icon.png', '/brand-assets/apple-touch-icon.png'],
      ['/apple-touch-icon-precomposed.png', '/brand-assets/apple-touch-icon.png'],
      ['/site.webmanifest', '/brand-assets/site.webmanifest'],
    ] as const) {
      expect(decide(path), path).toMatchObject({ kind: 'rewrite', to, why: 'root-file' })
    }
    // Only at the root, where browsers look: under a locale prefix it is no page and no file.
    expect(decide('/id/site.webmanifest').why).toBe('not-found')
  })

  it('lands every root file on a mounted engine route', () => {
    for (const { to } of ROOT_REWRITES) {
      const url = to.replace(/:\w+\*?/g, 'x')
      expect(
        ENGINE_ROUTES.some((route) => serves(route.path, url)),
        to,
      ).toBe(true)
    }
  })
})

describe('C13 — the proxy applies C10 v1.2', () => {
  it('refuses a planted %6F: the item page has one address', () => {
    expect(decide('/product/1706')).toMatchObject({ why: 'surface', to: '/en/item/1706' })
    for (const path of ['/pr%6Fduct/1706', '/product/1706-b%61li', '/%69d/produk/1706'])
      expect(decide(path), path).toMatchObject({ kind: 'rewrite', why: 'not-found' })
  })

  it('hands an exact legacy path to the legacy handler with its query', () => {
    const config: ProxyConfig = {
      ...gallery,
      routes: { ...gallery.routes, legacyPaths: ['/about-us', '/s'] },
    }
    expect(decide('/about-us', config)).toMatchObject({
      to: '/api/x/legacy/about-us',
      why: 'legacy',
    })
    expect(decide('/s?q=batavia&p=highest', config)).toMatchObject({
      to: '/api/x/legacy/s?q=batavia&p=highest',
      why: 'legacy',
    })
    expect(decide('/about-us', gallery)).toMatchObject({ why: 'surface', to: '/en/page/about-us' })
  })
})
