/**
 * The shop's pages and navigation on a real, pushed Postgres (TASKS.md 27.5): the public reads
 * never show a draft — an unpublished page is `null`, a published page's newer draft stays unseen,
 * and a menu or footer link to an unpublished page or product is dropped — while the preview read,
 * run as a signed-in owner, sees the latest draft, and as a store user sees nothing. Without
 * `CMS_TEST_POSTGRES_URL` the file skips — a setup state.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
// A save expires a cache tag after the response; outside a Next request there is no `after()`.
vi.mock('@engine/cache', async (original) => ({
  ...(await original<typeof import('@engine/cache')>()),
  invalidate: () => {},
}))

import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../../../../../packages/cms/src/collections/users/staff.test-support'
import { queryShopPage } from './load-page'
import { queryShopNavigation } from './navigation/load'

type Doc = { id: number }

const layout = (words: string) => [{ blockType: 'text', title: words, body: `${words}.` }]

describe.skipIf(!server)(
  'shop pages and navigation, on a real database',
  { timeout: 30_000 },
  () => {
    let stack: StaffStack
    let published: Doc
    let unpublished: Doc

    /** A write outside a request hands its cache tags to a collector (`@engine/cache` batch). */
    const write = <T>(run: (context: never) => Promise<T>) =>
      invalidationBatch().operation((context) => run(context as never)) as Promise<T>

    const page = (slug: string, title: string, status: 'draft' | 'published') =>
      write((context) =>
        stack.payload.create({
          context,
          collection: 'pages',
          locale: 'en',
          draft: status === 'draft',
          data: { site: 'shop', kind: 'page', slug, title, layout: layout(title), _status: status },
        } as never),
      ) as Promise<Doc>

    beforeAll(async () => {
      stack = await startStaffStack('web_shop_pages_test', (config, key) =>
        getPayload({ config, key }),
      )
      published = await page('about-us', 'Published words', 'published')
      // A newer draft of the published page: the public must keep the published words.
      await write((context) =>
        stack.payload.update({
          context,
          collection: 'pages',
          id: published.id,
          locale: 'en',
          draft: true,
          data: { title: 'Draft words', layout: layout('Draft words') },
        } as never),
      )
      await page('secret-sale', 'Not yet', 'draft')
      // Linked while published, then withdrawn: the links to it must go with it.
      unpublished = await page('withdrawn', 'Withdrawn page', 'published')
      await write((context) =>
        stack.payload.updateGlobal({
          context,
          slug: 'shop-header',
          locale: 'en',
          data: {
            mainMenu: [
              { label: 'About', target: 'page', page: published.id },
              { label: 'Secret', target: 'page', page: unpublished.id },
              { label: 'Instagram', target: 'url', url: 'https://www.instagram.com/oei/' },
            ],
            announcement: {
              enabled: true,
              text: 'Nyepi: closed',
              link: { target: 'page', page: unpublished.id },
            },
          },
        } as never),
      )
      await write((context) =>
        stack.payload.updateGlobal({
          context,
          slug: 'shop-footer',
          locale: 'en',
          data: {
            footerColumns: [
              {
                label: 'Hidden',
                links: [{ label: 'Secret', target: 'page', page: unpublished.id }],
              },
            ],
            legalLinks: [{ page: published.id }, { page: unpublished.id }],
          },
        } as never),
      )
      await write((context) =>
        stack.payload.update({
          context,
          collection: 'pages',
          id: unpublished.id,
          locale: 'en',
          data: { _status: 'draft' },
        } as never),
      )
    }, 180_000)
    afterAll(() => stack?.stop(), 60_000)

    it('the public read shows the published page, never its newer draft', async () => {
      const found = await queryShopPage(stack.payload, 'about-us', 'en')
      expect(found?.title).toBe('Published words')
      expect(JSON.stringify(found)).not.toContain('Draft words')
    })

    it('the public read shows no page that was never published, or was withdrawn', async () => {
      expect(await queryShopPage(stack.payload, 'secret-sale', 'en')).toBeNull()
      expect(await queryShopPage(stack.payload, 'withdrawn', 'en')).toBeNull()
    })

    it('the preview read, as the owner, shows the latest draft and the unpublished page', async () => {
      const owner = { user: { ...stack.users.owner, collection: 'users' } }
      expect((await queryShopPage(stack.payload, 'about-us', 'en', owner))?.title).toBe(
        'Draft words',
      )
      expect((await queryShopPage(stack.payload, 'secret-sale', 'en', owner))?.title).toBe(
        'Not yet',
      )
    })

    it('the preview read, as a store user, is refused: the collection’s access decides', async () => {
      const store = { user: { ...stack.users.store, collection: 'users' } }
      // Store staff read no pages at all: the read is refused, never answered with a draft.
      await expect(queryShopPage(stack.payload, 'secret-sale', 'en', store)).rejects.toThrow(
        /not allowed/,
      )
      await expect(queryShopPage(stack.payload, 'about-us', 'en', store)).rejects.toThrow(
        /not allowed/,
      )
    })

    it('the navigation drops every link to an unpublished page and leaks nothing else', async () => {
      const nav = await queryShopNavigation(stack.payload, 'en')
      expect(nav.menu.map((link) => link.label)).toEqual(['About', 'Instagram'])
      expect(nav.menu[0]?.href).toBe('/about-us')
      expect(nav.columns).toEqual([])
      expect(nav.legal).toEqual([{ label: 'Published words', href: '/about-us', external: false }])
      expect(nav.announcement).toMatchObject({ text: 'Nyepi: closed', link: null })
      const json = JSON.stringify(nav)
      expect(json).not.toMatch(/withdrawn|Secret|Draft words/i)
      expect(Object.keys(nav).sort()).toEqual(
        [
          'announcement',
          'columns',
          'copyright',
          'galleryLinkLabel',
          'legal',
          'logo',
          'menu',
        ].sort(),
      )
    })

    it('the header and footer globals stay closed to the public over REST', async () => {
      expect((await stack.rest('GET', '/api/globals/shop-header')).status).toBe(403)
      expect((await stack.rest('GET', '/api/globals/shop-footer')).status).toBe(403)
    })
  },
)
