/**
 * TASKS.md 3.6.d, driven in a browser at 1280 px as the owner, an editor and store staff, on a
 * production build: each sees the sidebar their role may; an invalid save shows a plain message
 * naming the field and the fix, in English and in Indonesian (switched on the profile); the
 * dashboard's counts equal SQL counts on the server's database. Then phase 3's admin **Done
 * when**: a store user sees only their store's orders, and `/admin` is a 404 on the gallery's host.
 * The owner's timed flow is `owner-flow.spec.ts`. Accounts and records: `fixtures.ts`.
 */
import { expect, test, type Page } from '@playwright/test'

import { ACCOUNTS, FIXTURE_EMAIL, type AccountKey } from './accounts'
import { choose, fieldError, rest, setLanguage, sidebar, signIn, toast, widgetCount } from './admin'
import { record, shot } from './evidence'
import { fixtures, sql, type Fixtures } from './local.mjs'

// One worker, in file order (the config): a failing case does not skip the ones after it.
let fx: Fixtures
test.beforeAll(() => {
  fx = fixtures()
})

const ROLES = ['owner', 'editor', 'storeA'] as const satisfies readonly AccountKey[]
const LANGUAGES = ['en', 'id'] as const

/** The sidebar each role may see (TASKS.md 3.6.b; CONTENT-MODEL.md §7), in English. */
const SIDEBARS: Record<(typeof ROLES)[number], Record<string, string[]>> = {
  owner: {
    Settings: ['Staff', 'Events', 'Site settings'],
    'Stores and stock': ['Stores', 'Stock'],
    Orders: ['Orders', 'Payment events'],
    Shop: ['Discount codes', 'Products'],
    Antiques: ['Antiques', 'Makers', 'Places', 'Terms', 'Images', 'Masters'],
    Content: ['Pages', 'Redirects'],
    'Leads and partners': ['Leads', 'Partners', 'Chat sessions'],
  },
  // Staff: the editor's own account, the only one they may read.
  editor: {
    Settings: ['Staff'],
    'Stores and stock': ['Stores', 'Stock'],
    Orders: ['Orders'],
    Shop: ['Products'],
    Antiques: ['Antiques', 'Makers', 'Places', 'Terms', 'Images', 'Masters'],
    Content: ['Pages', 'Redirects'],
  },
  storeA: { 'Stores and stock': ['Stores', 'Stock'], Orders: ['Orders'] },
}

const ACTING = `status NOT IN ('delivered', 'cancelled', 'expired')`
const count = (query: string) => Number(sql(query))

for (const role of ROLES) {
  test(`${role}: the sidebar and the dashboard counts, in both languages`, async ({ page }) => {
    await signIn(page, ACCOUNTS[role].email)
    for (const language of LANGUAGES) {
      await setLanguage(page, language)
      const groups = await sidebar(page)
      if (language === 'en') expect(groups).toEqual(SIDEBARS[role])
      else expect(Object.keys(groups)).toHaveLength(Object.keys(SIDEBARS[role]).length)
      // The Order panel link under the groups (owner, editor and store staff; 10.4 proxy run), and
      // the dashboard's widgets open the panel (`/admin/orders`) and the inbox (`/admin/leads`).
      await expect(page.locator('nav a.nav__link[href="/admin/orders"]')).toHaveText(
        language === 'en' ? 'Order panel' : 'Panel pesanan',
      )
      await page.screenshot({ path: shot(`sidebar-${role}-${language}-1280`) })

      const store = role === 'storeA' ? fx.stores.a.id : null
      const ordersSql = count(
        `SELECT count(*) FROM orders WHERE ${ACTING}${store ? ` AND store_id = ${store}` : ''}`,
      )
      const leadsSql = count(`SELECT count(*) FROM leads WHERE status = 'new'`)
      const orders = await widgetCount(page, '/admin/orders')
      const leads = await widgetCount(page, '/admin/leads')
      expect(orders).toBe(ordersSql)
      // New leads are the owner's panel; nobody else is shown one.
      expect(leads).toBe(role === 'owner' ? leadsSql : null)
      const panel = language === 'en' ? 'Orders to act on' : 'Pesanan perlu tindakan'
      const widget = page.locator('a[href="/admin/orders"]').filter({ hasText: /\d$/ })
      await expect(widget).toContainText(panel)
      await record(`dashboard.${role}.${language}`, { orders, ordersSql, leads, leadsSql, groups })
    }
  })
}

/** Each role's invalid save: the form, what to enter, and the field whose message is read. */
type Refusal = { field: string; open(page: Page): Promise<void>; en: RegExp; id: RegExp }

const REFUSALS: Record<(typeof ROLES)[number], Refusal> = {
  // An antique missing its guard fields, published: the object type is the one read.
  owner: {
    field: '#field-objectType',
    async open(page) {
      await page.goto('/admin/collections/works/create')
      await page.locator('#field-title').fill('E2E: an antique missing its guard fields')
      await page.locator('#action-save').click()
    },
    en: /Say what kind of object it is/,
    id: /Sebutkan jenis benda ini/,
  },
  // A product with a negative price.
  editor: {
    field: '#field-price',
    async open(page) {
      await page.goto('/admin/collections/products/create')
      await page.locator('#field-sku').fill(`E2E-NEG-${Date.now()}`)
      await page.locator('#field-name').fill('E2E: a product with a negative price')
      await page.locator('#field-price').fill('-5000')
      await page.locator('#action-save-draft').click()
    },
    en: /price is a whole number of rupiah above zero/i,
    id: /harga/i,
  },
  // Store staff: their own store's order moved back, from processing to paid.
  storeA: {
    field: '#field-status',
    async open(page) {
      const order = sql(
        `SELECT id FROM orders WHERE store_id = ${fx.stores.a.id} AND status = 'processing' LIMIT 1`,
      )
      await page.goto(`/admin/collections/orders/${order}`)
      await choose(page, '#field-status', /^(Paid|Dibayar)$/)
      await page.locator('#action-save').click()
      await expect(page.locator('[data-sonner-toast][data-type="error"]')).toBeVisible()
      expect(sql(`SELECT status FROM orders WHERE id = ${order}`)).toBe('processing')
    },
    en: /one step forward only.*the next step is/i,
    id: /satu langkah|langkah berikutnya/i,
  },
}

for (const role of ROLES) {
  for (const language of LANGUAGES) {
    test(`${role}: an invalid save says what is wrong and how to fix it, in ${language}`, async ({
      page,
    }) => {
      await signIn(page, ACCOUNTS[role].email)
      await setLanguage(page, language)
      const refusal = REFUSALS[role]
      await refusal.open(page)
      const shown = await toast(page)
      const field = await fieldError(page, refusal.field)
      await page.screenshot({ path: shot(`invalid-${role}-${language}-1280`), fullPage: true })
      await record(`invalid.${role}.${language}`, { toast: shown, field })
      expect(field).toMatch(refusal[language])
    })
  }
}

test('a store user sees only their own store’s orders; the other store’s user none of them', async ({
  page,
}) => {
  const fixtureOrders = (store: number) =>
    count(
      `SELECT count(*) FROM orders WHERE contact_email = '${FIXTURE_EMAIL}' AND store_id = ${store}`,
    )
  const seen: Record<string, unknown> = {}
  for (const [who, own, other] of [
    ['storeA', fx.stores.a, fx.stores.b],
    ['storeB', fx.stores.b, fx.stores.a],
  ] as const) {
    await signIn(page, ACCOUNTS[who].email)
    await setLanguage(page, 'en')
    const api = await rest(page, '/api/orders?limit=200&depth=0')
    expect(api.status).toBe(200)
    const docs = (api.body as { docs: { id: number; store: number }[] }).docs
    expect(docs.length).toBeGreaterThan(0)
    expect(docs.every((order) => order.store === own.id)).toBe(true)
    expect(docs.length).toBe(count(`SELECT count(*) FROM orders WHERE store_id = ${own.id}`))

    // The other store's orders, asked for by store and by id: an empty list, and not found.
    const theirs = await rest(page, `/api/orders?depth=0&where[store][equals]=${other.id}`)
    expect((theirs.body as { totalDocs: number }).totalDocs).toBe(0)
    const otherId = sql(`SELECT id FROM orders WHERE store_id = ${other.id} LIMIT 1`)
    expect((await rest(page, `/api/orders/${otherId}?depth=0`)).status).not.toBe(200)

    await page.goto('/admin/collections/orders?limit=100')
    await expect(page.locator('.table tbody tr, table tbody tr')).toHaveCount(docs.length)
    await page.screenshot({ path: shot(`orders-${who}-1280`) })
    await page.goto(`/admin/collections/orders?where[store][equals]=${other.id}`)
    await expect(page.locator('table tbody tr')).toHaveCount(0)
    await page.screenshot({ path: shot(`orders-${who}-other-store-1280`) })
    seen[who] = { store: own.code, listed: docs.length, fixtureOrders: fixtureOrders(own.id) }
  }
  await record('isolation', seen)
})

test('/admin is a 404 on the gallery’s host', async ({ page }) => {
  const { port, gallery } = test.info().project.metadata as { port: string; gallery: string }
  for (const path of ['/admin', '/admin/login', '/admin/collections/orders']) {
    const answer = await page.goto(`http://${gallery}:${port}${path}`)
    expect(answer?.status(), path).toBe(404)
  }
  await page.screenshot({ path: shot('gallery-admin-404-1280') })
  await record('galleryAdmin', 404)
})
