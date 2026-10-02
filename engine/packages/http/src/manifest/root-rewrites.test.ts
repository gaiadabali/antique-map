// C13 v1.2 (TASKS.md 3.4.c): the home-screen icon and web manifest a browser asks for at the root
// are root files, answered by the brand-assets route rather than the designed not-found page and
// its loader (3.1 senior-fe #12); and, as the proxy applies C10 v1.2, a segment in another
// spelling is not found while a moved static page reaches the legacy handler.
import { fileURLToPath } from 'node:url'

import { loadBrandConfig } from '@engine/config/loader'
import { CLAIMED_SEGMENTS, ROOT_FILES, rootFileOf } from '@engine/config/routes'
import { describe, expect, it } from 'vitest'

import { ENGINE_ROUTES, ROOT_REWRITES } from '../manifest'
import { decideProxy, NOT_FOUND_SEGMENT, type ProxyConfig } from '../proxy/route'

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
    for (const [path, to] of [
      ['/apple-touch-icon.png', '/brand-assets/apple-touch-icon.png'],
      ['/apple-touch-icon-precomposed.png', '/brand-assets/apple-touch-icon.png'],
      ['/apple-touch-icon-180x180.png', '/brand-assets/apple-touch-icon.png'], // 3.4 senior-fe #7
      ['/apple-touch-icon-180x180-precomposed.png', '/brand-assets/apple-touch-icon.png'],
      ['/site.webmanifest', '/brand-assets/site.webmanifest'],
    ] as const) {
      expect(decide(path), path).toMatchObject({ kind: 'rewrite', to, why: 'root-file' })
    }
    // Only at the root, where browsers look: under a locale prefix it is no page and no file.
    expect(decide('/id/site.webmanifest').why).toBe('not-found')
  })

  it('rewrites exactly C10’s root files, so no route-map segment or legacy rule is one', () => {
    expect(ROOT_REWRITES.map((rewrite) => rewrite.from)).toEqual([...ROOT_FILES])
    expect(CLAIMED_SEGMENTS).toContain(NOT_FOUND_SEGMENT)
    // The proxy's matcher and C10's agree, path by path.
    const filled = ROOT_FILES.map((pattern) => pattern.replace(/:\w+\*?/g, '180x180'))
    for (const path of [
      ...filled,
      '/robots.txt/x',
      '/Robots.txt',
      '/sitemap-.xml',
      '/apple-touch-icon-.png',
      '/apple-touch-icon-a/b.png',
      '/id/robots.txt',
      '/.well-known',
      '/favicon.ico.bak',
    ]) {
      expect(decide(path).why === 'root-file', path).toBe(rootFileOf(path) !== null)
    }
    expect(filled.every((path) => rootFileOf(path) !== null)).toBe(true)
  })

  // The sitemaps and `.well-known` have no handler yet, so no route is mounted for them (TASKS.md
  // 1.4): their rewrites land on Payload's REST catch-all, which answers 404.
  const UNMOUNTED = ['/api/x/sitemap', '/api/x/sitemap/:name', '/api/x/well-known/:path*']

  it('lands every other root file on a mounted engine route', () => {
    expect(ROOT_REWRITES.filter(({ to }) => UNMOUNTED.includes(to)).length).toBe(UNMOUNTED.length)
    for (const { to } of ROOT_REWRITES.filter((rewrite) => !UNMOUNTED.includes(rewrite.to))) {
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
    for (const path of ['/pr%6Fduct/1706', '/%69d/produk/1706', '/product/1706-a%2Fb'])
      expect(decide(path), path).toMatchObject({ kind: 'rewrite', why: 'not-found' })
    // An old link's odd slug reaches the item route by its id with a slug no item has, so the
    // route answers 301 to the current URL, never a second 200 (3.4 senior-fe #1).
    expect(decide('/product/1706-b%61li')).toMatchObject({
      why: 'surface',
      to: '/en/item/1706-b%2561li',
    })
  })

  it('closes the account area when neither account module is on (3.4 senior-be #5)', () => {
    const accountless: ProxyConfig = {
      ...gallery,
      modules: { ...gallery.modules, 'accounts.buyers': false, 'accounts.retailers': false },
    }
    // The gallery spells its closed area `my-account`: `/account/…` is the old site's (36.4.e).
    for (const path of [
      '/my-account',
      '/my-account/orders',
      '/my-account/set-password',
      '/id/akun',
    ])
      expect(decide(path, accountless), path).toMatchObject({ kind: 'rewrite', why: 'not-found' })
    // Either module opens it: the gallery's buyers, or a shop's partners.
    const buyers: ProxyConfig = {
      ...accountless,
      modules: { ...accountless.modules, 'accounts.buyers': true },
    }
    expect(decide('/my-account/orders', buyers)).toMatchObject({
      why: 'surface',
      to: '/en/account/orders',
    })
    const partners: ProxyConfig = {
      ...accountless,
      modules: { ...accountless.modules, 'accounts.retailers': true },
    }
    expect(decide('/my-account', partners)).toMatchObject({
      why: 'surface',
      to: '/en/account/overview',
    })
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
