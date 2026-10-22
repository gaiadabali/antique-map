// The root files (ARCHITECTURE.md §5): each site's icons and manifest a browser asks for at the
// root answer from that site's own files, robots and the sitemaps from engine routes; and, as the
// proxy applies each site's routes, a segment in another spelling is not found.
import { CLAIMED_SEGMENTS, ROOT_FILES, rootFileOf } from '@engine/config/sites'
import { describe, expect, it } from 'vitest'

import { ENGINE_ROUTES, ROOT_REWRITES, SITE_ASSETS } from '../manifest'
import { decideProxy, NOT_FOUND_SEGMENT } from '../proxy/route'

const ENV = { GALLERY_HOSTS: 'gallery.localhost', SHOP_HOSTS: 'shop.localhost' }
const decide = (path: string, site: 'gallery' | 'shop' = 'gallery') =>
  decideProxy(
    { url: new URL(path, 'http://localhost'), headers: new Headers({ host: `${site}.localhost` }) },
    { env: ENV },
  )

/** Whether a mount path serves a URL: its static head, then a catch-all (`[[...]]` takes none). */
const serves = (mount: string, url: string) => {
  const head = mount.replace(/\[.*$/, '')
  if (head === mount) return url === mount
  if (mount.includes('[[...') && url === head.replace(/\/$/, '')) return true
  return url.startsWith(head) && url.length > head.length
}

describe('ROOT_REWRITES', () => {
  it('answers the touch icons and the web manifest from each site’s own files', () => {
    for (const site of ['gallery', 'shop'] as const) {
      for (const [path, file] of [
        ['/apple-touch-icon.png', 'apple-touch-icon.png'],
        ['/apple-touch-icon-precomposed.png', 'apple-touch-icon.png'],
        ['/apple-touch-icon-180x180.png', 'apple-touch-icon.png'],
        ['/apple-touch-icon-180x180-precomposed.png', 'apple-touch-icon.png'],
        ['/site.webmanifest', 'site.webmanifest'],
        ['/favicon.ico', 'favicon.ico'],
      ] as const) {
        expect(decide(path, site), `${site} ${path}`).toMatchObject({
          kind: 'rewrite',
          to: `/${site}/${file}`,
          why: 'root-file',
        })
      }
    }
  })

  it('rewrites exactly the routes’ root files, so no route-map segment or legacy rule is one', () => {
    expect(ROOT_REWRITES.map((rewrite) => rewrite.from)).toEqual([...ROOT_FILES])
    expect(CLAIMED_SEGMENTS).toContain(NOT_FOUND_SEGMENT)
    const filled = ROOT_FILES.map((pattern) => pattern.replace(/:\w+\*?/g, '180x180'))
    for (const path of [
      ...filled,
      '/robots.txt/x',
      '/Robots.txt',
      '/sitemap-.xml',
      '/apple-touch-icon-a/b.png',
      '/id/robots.txt',
      '/.well-known',
      '/favicon.ico.bak',
    ]) {
      expect(decide(path).why === 'root-file', path).toBe(rootFileOf(path) !== null)
    }
  })

  it('lands every root file on a mounted engine route or a file every site ships', () => {
    const files: readonly string[] = Object.values(SITE_ASSETS)
    for (const { to } of ROOT_REWRITES) {
      if (to.startsWith('/:site/')) {
        expect(files, to).toContain(to.slice('/:site/'.length))
        continue
      }
      const url = to.replace(/:\w+\*?/g, 'x')
      expect(
        ENGINE_ROUTES.some((route) => serves(route.path, url)),
        to,
      ).toBe(true)
    }
  })
})

describe('the proxy applies each site’s routes strictly', () => {
  it('refuses a planted %6F: the item page has one address', () => {
    expect(decide('/product/1706')).toMatchObject({ why: 'surface', to: '/gallery/en/item/1706' })
    for (const path of ['/pr%6Fduct/1706', '/%69d/produk/1706', '/product/1706-a%2Fb'])
      expect(decide(path), path).toMatchObject({ kind: 'rewrite', why: 'not-found' })
    // An old link's odd slug reaches the item route by its id with a slug no item has, so the
    // route answers a permanent redirect to the current URL, never a second 200.
    expect(decide('/product/1706-b%61li')).toMatchObject({
      why: 'surface',
      to: '/gallery/en/item/1706-b%2561li',
    })
  })
})
