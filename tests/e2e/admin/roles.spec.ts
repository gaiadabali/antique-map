/**
 * TASKS.md 3.6.d, driven in a browser at 1280 px as the owner, an editor and store staff, on a
 * production build: each sees the sidebar their role may; an invalid save shows a plain message
 * naming the field and the fix, in English and in Indonesian (switched on the profile); the
 * Today home's counts equal SQL counts on the server's database. Then phase 3's admin **Done
 * when**: a store user sees only their store's orders, and `/admin` is a 404 on the gallery's host.
 * The owner's timed flow is `owner-flow.spec.ts`. Accounts and records: `fixtures.ts`.
 */
import { expect, test, type Page } from '@playwright/test'

import { ACCOUNTS, FIXTURE_EMAIL, type AccountKey } from './accounts'
import {
  choose,
  fieldError,
  fillSettled,
  rest,
  setLanguage,
  settled,
  sidebar,
  signIn,
  toast,
  widgetCount,
} from './admin'
import { record, shot } from './evidence'
import { fixtures, sql, type Fixtures } from './local.mjs'

// One worker, in order: each role's cases switch that one account's admin language (en, then id), so
// two cases of one role side by side flip it under each other (CI run 37985600912: the editor's and
// the store user's invalid-save cases flaky at 4 workers).
test.describe.configure({ mode: 'default' })

// The cases are independent of each other (a failing one does not skip the rest). The config runs
// this file apart from the other admin files: they share its accounts and the counts it reads.
let fx: Fixtures
test.beforeAll(() => {
  fx = fixtures()
})

const ROLES = ['owner', 'editor', 'storeA'] as const satisfies readonly AccountKey[]
const LANGUAGES = ['en', 'id'] as const

/**
 * The sidebar each role may see (TASKS.md 3.6.b, 27.6.b; CONTENT-MODEL.md §7; `admin/nav/plan.ts`),
 * in English: the shop's five groups, then the technical records and the gallery, both folded
 * (their entries hidden until opened). Object order is the order shown.
 */
const SIDEBARS: Record<(typeof ROLES)[number], Record<string, string[]>> = {
  owner: {
    Content: ['Pages', 'Header', 'Footer', 'Media'],
    Orders: ['Orders', 'Leads inbox', 'Partners'],
    Catalogue: ['Products', 'Categories', 'Discount codes'],
    Stores: ['Stores', 'Stock by store', 'Import from a spreadsheet'],
    Settings: ['Site settings', 'Staff', 'Chat sessions'],
    'Technical records': [],
    'Indies Gallery — antiques': [],
  },
  // Staff: the editor's own account, the only one they may read; no leads, settings or records.
  editor: {
    Content: ['Pages', 'Header', 'Footer', 'Media'],
    Orders: ['Orders'],
    Catalogue: ['Products', 'Categories'],
    Stores: ['Stores', 'Stock by store'],
    Settings: ['Staff'],
    'Indies Gallery — antiques': [],
  },
  // A store user is offered their two screens alone (TASKS.md 27.6.b).
  storeA: { Orders: ['Orders'], Stores: ['Stock by store'] },
}

/** The same groups' titles in Indonesian (the entries under them follow the collections' own labels). */
const GROUPS_ID: Record<string, string> = {
  Orders: 'Pesanan',
  Catalogue: 'Katalog',
  Stores: 'Toko dan stok',
  Content: 'Konten',
  Settings: 'Pengaturan',
  'Technical records': 'Catatan teknis',
  'Indies Gallery — antiques': 'Indies Gallery — antik',
}

const NEEDS_ACTION = `(status IN ('awaiting_quote', 'pending_payment', 'paid') OR needs_attention_flag)`
const count = (query: string) => Number(sql(query))

for (const role of ROLES) {
  test(`${role}: the sidebar and the Today counts, in both languages`, async ({ page }) => {
    await signIn(page, ACCOUNTS[role].email)
    for (const language of LANGUAGES) {
      await setLanguage(page, language)
      const groups = await sidebar(page)
      // Same groups, same order, each entry named (English), or each group titled (Indonesian).
      if (language === 'en') {
        expect(groups).toEqual(SIDEBARS[role])
        expect(Object.keys(groups)).toEqual(Object.keys(SIDEBARS[role]))
      } else {
        expect(Object.keys(groups)).toEqual(Object.keys(SIDEBARS[role]).map((en) => GROUPS_ID[en]))
      }
      // The home link above the groups (not for store staff), and the language link under them.
      const home = page.locator('nav #nav-link-today')
      if (role === 'storeA') await expect(home).toHaveCount(0)
      else await expect(home).toHaveText(language === 'en' ? 'Today' : 'Hari ini')
      await expect(page.locator('nav a[href="/admin/account#language-select"]')).toHaveText(
        'Bahasa Indonesia / English',
      )
      // The Orders link — the orders inbox, TASKS.md 27.3 (owner, editor and store staff).
      await expect(page.locator('nav .nav__link[href="/admin/orders"]')).toHaveText(
        language === 'en' ? 'Orders' : 'Pesanan',
      )
      await page.screenshot({ path: shot(`sidebar-${role}-${language}-1280`) })

      if (role === 'storeA') {
        // Store staff land on their orders, never the Today home (a server redirect), inside
        // Payload's frame (the sidebar above was read there).
        await page.goto('/admin')
        await expect(page).toHaveURL(/\/admin\/orders$/)
        await expect(page.locator('h1').first()).toHaveText(
          language === 'en' ? 'Orders' : 'Pesanan',
        )
        await record(`dashboard.${role}.${language}`, { landing: '/admin/orders', groups })
        continue
      }
      await page.goto('/admin/today')
      const needsSql = count(`SELECT count(*) FROM orders WHERE ${NEEDS_ACTION}`)
      const packingSql = count(`SELECT count(*) FROM orders WHERE status = 'processing'`)
      const leadsSql = count(`SELECT count(*) FROM leads WHERE status = 'new'`)
      const needs = await widgetCount(page, '/admin/orders?tab=needs_action')
      const packing = await widgetCount(page, '/admin/orders?tab=processing')
      const leads = await widgetCount(page, '/admin/leads')
      expect(needs).toBe(needsSql)
      expect(packing).toBe(packingSql)
      // New leads are the owner's card; nobody else is shown one.
      expect(leads).toBe(role === 'owner' ? leadsSql : null)
      await expect(page.locator('h1').first()).toHaveText(language === 'en' ? 'Today' : 'Hari ini')
      await record(`dashboard.${role}.${language}`, {
        needs,
        needsSql,
        packing,
        packingSql,
        leads,
        leadsSql,
        groups,
      })
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
      await fillSettled(page, '#field-title', 'E2E: an antique missing its guard fields')
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
      // The price is on the one-screen editor with the SKU and name (`products/fields.ts`, 27.2).
      await fillSettled(page, '#field-price', '-5000')
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
      await settled(page, () => choose(page, '#field-status', /^(Paid|Dibayar)$/))
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
