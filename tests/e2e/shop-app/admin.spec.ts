/**
 * The shop app's admin with its three roles (TASKS.md 23.6.a; phase 23's **Done when**; 23.1.e):
 * the owner, an editor and store staff each sign in on the shop's own host and land where their
 * role does — the owner and the editor on the admin's home (its Today link above the sidebar's
 * groups; Partners in the owner's alone), store staff on their orders. A store
 * user sees only its own store's orders, in the REST API and in the admin's list, and is refused
 * the other store's order by id; the other store's user the mirror image. Partners, the owner's
 * alone, are refused to the editor. Payload's collection access decides all of it (AGENTS.md
 * "Store users see only their store"); the counts are the owner's, who sees every order.
 * The landing screens at 390 and 1280, axe clean.
 */
import { expect, test, type APIRequestContext } from '@playwright/test'

import { ACCOUNTS, type AccountKey } from '../admin/accounts'
import { rest, sidebar, signIn } from '../admin/admin'
import { axeClean, listOrders, record, shot, staffApi, WIDTHS } from './support'

let owner: APIRequestContext
test.beforeAll(async () => {
  owner = await staffApi('owner')
})
test.afterAll(async () => {
  await owner.dispose()
})

/** Where `/admin` leaves each role, and whether the sidebar offers the Today home and Partners. */
const LANDING = {
  owner: { path: /\/admin$/, today: true, partners: true },
  editor: { path: /\/admin$/, today: true, partners: false },
  storeA: { path: /\/admin\/orders$/, today: false, partners: false },
} as const

for (const role of ['owner', 'editor', 'storeA'] as const) {
  test(`${role} signs in on the shop's host and lands where the role does`, async ({ page }) => {
    await signIn(page, ACCOUNTS[role].email)
    const groups = await sidebar(page)
    const entries = Object.values(groups).flat()
    expect(entries.includes('Partners'), 'Partners in the sidebar').toBe(LANDING[role].partners)
    await expect(page.locator('nav #nav-link-today')).toHaveCount(LANDING[role].today ? 1 : 0)
    await page.goto('/admin')
    await expect(page).toHaveURL(LANDING[role].path)
    const me = await rest(page, '/api/users/me')
    expect((me.body as { user: { role: string } }).user.role).toBe(ACCOUNTS[role].role)
    for (const viewport of WIDTHS) {
      await page.setViewportSize(viewport)
      await page.waitForLoadState('networkidle').catch(() => undefined)
      await axeClean(page, `${role}'s landing at ${viewport.width}`)
      await page.screenshot({
        path: shot(`admin-${role}-landing-${viewport.width}`, test.info().outputDir),
      })
    }
    // Partners are the owner's alone (`partners` access): the editor and store staff are refused.
    const partners = await rest(page, '/api/partners?limit=1&depth=0')
    expect(partners.status, 'GET /api/partners').toBe(role === 'owner' ? 200 : 403)
    await record(`admin.${role}`, {
      landed: new URL(page.url()).pathname,
      partners: partners.status,
      sidebar: groups,
    })
  })
}

/** The stores the fixture orders sit in, by the owner's view of every order. */
async function storesWithOrders(): Promise<Map<number, number[]>> {
  const byStore = new Map<number, number[]>()
  for (const order of await listOrders(owner)) {
    if (order.store === null) continue
    byStore.set(order.store, [...(byStore.get(order.store) ?? []), order.id])
  }
  return byStore
}

test('a store user sees only its own store’s orders; the other store’s none of them', async ({
  page,
}) => {
  const byStore = await storesWithOrders()
  const seen: Record<string, unknown> = {}
  for (const who of ['storeA', 'storeB'] as const satisfies readonly AccountKey[]) {
    const api = await staffApi(who)
    const mine = await listOrders(api)
    await api.dispose()
    expect(mine.length, `${who} has orders`).toBeGreaterThan(0)
    const own = mine[0]!.store!
    expect(
      mine.every((order) => order.store === own),
      `${who}: one store's orders only`,
    ).toBe(true)
    expect(
      mine.map((order) => order.id),
      `${who}: all of its store's`,
    ).toEqual(byStore.get(own))

    const other = [...byStore.keys()].find((store) => store !== own)!
    const otherId = byStore.get(other)![0]!
    await signIn(page, ACCOUNTS[who].email)
    const theirs = await rest(page, `/api/orders?depth=0&where[store][equals]=${other}`)
    expect((theirs.body as { totalDocs: number }).totalDocs, 'the other store, by store').toBe(0)
    const byId = await rest(page, `/api/orders/${otherId}?depth=0`)
    expect(byId.status, 'the other store’s order, by id').not.toBe(200)

    await page.goto('/admin/collections/orders?limit=100')
    await expect(page.locator('table tbody tr')).toHaveCount(mine.length)
    // The Sending store cell loads its store after the rows: every row names one store, its own.
    const cells = page.locator('table tbody tr td:nth-child(4)')
    await expect(cells.first()).not.toHaveText(/Loading|<No /)
    expect(new Set(await cells.allInnerTexts()).size, 'one store named').toBe(1)
    await page.screenshot({ path: shot(`admin-${who}-orders-1280`, test.info().outputDir) })
    seen[who] = { store: own, listed: mine.length, otherStore: other, otherById: byId.status }
  }
  // The two stores' users between them see every store-assigned order, and no order twice.
  const total = [...byStore.values()].reduce((sum, ids) => sum + ids.length, 0)
  await record('admin.storeIsolation', { ...seen, ownerSeesStoreAssigned: total })
})
