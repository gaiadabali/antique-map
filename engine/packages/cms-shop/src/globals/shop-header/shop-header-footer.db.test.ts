/**
 * `shop-header` and `shop-footer` on a real Postgres (TASKS.md 27.1.a, 27.1.e; split in 27.6): the
 * owner and the editors read and write them over REST; store staff and the public neither read nor
 * write them. A link is saved with what it points at, and refused without it or with an address
 * that is not a web address.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// A save expires a cache tag after the response; outside a Next request there is no `after()`.
vi.mock('@engine/cache', async (original) => ({
  ...(await original<typeof import('@engine/cache')>()),
  invalidate: () => {},
}))

import { server, startStaffStack, type StaffStack } from '../../db/staff-stack.test-support'

const HEADER = '/api/globals/shop-header'
const FOOTER = '/api/globals/shop-footer'

type As = 'owner' | 'editor' | 'store' | undefined

// Each case makes several REST round trips as two roles, and the first warms the routes: under the
// full `test:db` run the default 5 s ran out once (27.3's report), so the cases get 30 s.
describe.skipIf(!server)(
  'shop-header and shop-footer, on a real database',
  { timeout: 30_000 },
  () => {
    let stack: StaffStack
    let page: number

    beforeAll(async () => {
      stack = await startStaffStack('cms_shop_header_footer_test', (config, key) =>
        getPayload({ config, key }),
      )
      const created = (await stack.payload.create({
        collection: 'pages',
        locale: 'en',
        data: { site: 'shop', kind: 'page', slug: 'privacy', title: 'Privacy' } as never,
      })) as unknown as { id: number }
      page = created.id
    }, 180_000)
    afterAll(() => stack?.stop(), 60_000)

    const save = (as: As, json: unknown, route = HEADER) =>
      stack.rest('POST', `${route}?locale=en`, { as, json })

    it('the owner and the editors read and write both', async () => {
      for (const as of ['owner', 'editor'] as const) {
        for (const route of [HEADER, FOOTER]) {
          expect((await stack.rest('GET', route, { as })).status, `${as} ${route}`).toBe(200)
        }
        const header = await save(as, {
          mainMenu: [
            { label: 'Privacy', target: 'page', page },
            {
              label: 'Instagram',
              target: 'url',
              url: 'https://www.instagram.com/oldeastindiesart/',
            },
          ],
          announcement: { enabled: true, text: `Saved by the ${as}` },
        })
        expect(header.status, as).toBe(200)
        const footer = await save(as, { legalLinks: [{ page }], copyright: `© ${as}` }, FOOTER)
        expect(footer.status, as).toBe(200)
      }
      const read = (await stack.payload.findGlobal({
        slug: 'shop-header',
        depth: 0,
        overrideAccess: true,
      })) as unknown as {
        mainMenu: { label: string; target: string; page?: number; url?: string }[]
        announcement: { text: string }
      }
      expect(read.mainMenu.map((item) => item.label)).toEqual(['Privacy', 'Instagram'])
      expect(read.mainMenu[0]).toMatchObject({ target: 'page', page })
      expect(read.announcement.text).toBe('Saved by the editor')
      const foot = (await stack.payload.findGlobal({
        slug: 'shop-footer',
        depth: 0,
        overrideAccess: true,
      })) as unknown as { legalLinks: { page: number }[]; copyright: string }
      expect(foot.legalLinks.map((link) => link.page)).toEqual([page])
      expect(foot.copyright).toBe('© editor')
    })

    it('store staff and the public neither read nor write either', async () => {
      for (const as of ['store', undefined] as const) {
        for (const route of [HEADER, FOOTER]) {
          expect((await stack.rest('GET', route, { as })).status, `${as} ${route}`).toBe(403)
        }
        expect((await save(as, { mainMenu: [] })).status, String(as)).toBe(403)
        expect((await save(as, { copyright: 'Changed' }, FOOTER)).status, String(as)).toBe(403)
      }
      const read = (await stack.payload.findGlobal({
        slug: 'shop-footer',
        overrideAccess: true,
      })) as unknown as { copyright?: string | null }
      expect(read.copyright).toBe('© editor')
    })

    it('refuses a link without its target, or with an address that is not a web address', async () => {
      for (const item of [
        { label: 'No page', target: 'page' },
        { label: 'Script', target: 'url', url: 'javascript:alert(1)' },
        { label: 'Elsewhere', target: 'url', url: '//elsewhere.example' },
      ]) {
        expect((await save('owner', { mainMenu: [item] })).status, item.label).toBe(400)
      }
      expect((await save('owner', { legalLinks: [{ label: 'No page' }] }, FOOTER)).status).toBe(400)
    })

    it('refuses an announcement switched on without its words, or ending before it starts', async () => {
      expect((await save('owner', { announcement: { enabled: true, text: '' } })).status).toBe(400)
      const dated = await save('owner', {
        announcement: {
          enabled: true,
          text: 'Sale',
          startsAt: '2026-12-10T00:00:00.000Z',
          endsAt: '2026-12-01T00:00:00.000Z',
        },
      })
      expect(dated.status).toBe(400)
    })
  },
)
