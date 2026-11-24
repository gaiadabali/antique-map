/**
 * Partner sign-in on the shop app (TASKS.md 23.6.a; phase 23's **Done when**): an approved
 * partner — made here by the owner through the REST API, sign-in on, a password set (its scrypt
 * hash kept, `cms-shop/collections/partners`) — signs in on the partnership page's "Already a
 * partner" box with the shop's own cookie, never the admin. A wrong password is refused in the
 * same words as an unknown address (A4); the right one shows the partner's account; signing out
 * puts the form back. The signed-in page at 390 and 1280, axe clean.
 */
import { randomBytes } from 'node:crypto'

import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

import { axeClean, noOverflow, record, shot, SHOP_ORIGIN, staffApi, WIDTHS } from './support'

const PARTNER = { name: 'E2E Partner Hotel', email: 'e2e-partner@example.test' }
// A fresh password each run (A2: at least 12 characters, not a common one); setting it also clears
// any lockout an earlier run's wrong passwords left.
const PASSWORD = `Partner-${randomBytes(9).toString('base64url')}`

let owner: APIRequestContext
test.beforeAll(async () => {
  owner = await staffApi('owner')
  const found = await owner.get(
    `/api/partners?depth=0&limit=1&where[signIn.email][equals]=${encodeURIComponent(PARTNER.email)}`,
  )
  expect(found.status(), 'the owner reads partners').toBe(200)
  const existing = ((await found.json()) as { docs: { id: number }[] }).docs[0]
  const data = {
    name: PARTNER.name,
    kind: 'hotel',
    status: 'active',
    signIn: { enabled: true, email: PARTNER.email, newPassword: PASSWORD, lockedUntil: null },
  }
  const saved = existing
    ? await owner.patch(`/api/partners/${existing.id}`, { data })
    : await owner.post('/api/partners', { data })
  expect(saved.status(), 'the owner turns the partner’s sign-in on').toBeLessThan(300)
})
test.afterAll(async () => {
  await owner.dispose()
})

/** The "Already a partner" box (the page's enquiry form has its own email field). */
const box = (page: Page) => page.getByRole('region', { name: 'Sign in to your prices.' })

async function signInWith(page: Page, password: string): Promise<void> {
  await box(page).getByLabel('Email address', { exact: true }).fill(PARTNER.email)
  await box(page).getByLabel('Password', { exact: true }).fill(password)
  await box(page).getByRole('button', { name: 'Sign in', exact: true }).click()
}

test('an approved partner signs in on the partnership page, and out again', async ({ page }) => {
  const answer = await page.goto(`${SHOP_ORIGIN}/collaboration`)
  expect(answer?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Sign in to your prices.' })).toBeVisible()

  await signInWith(page, `${PASSWORD}-wrong`)
  await expect(box(page).getByRole('alert')).toHaveText(
    'That email and password do not match an approved partner account.',
  )

  await signInWith(page, PASSWORD)
  await expect(page.getByText(`Welcome, ${PARTNER.name}.`)).toBeVisible()
  await expect(page.getByText(PARTNER.email)).toBeVisible()
  const cookies = (await page.context().cookies()).map((each) => each.name)
  expect(cookies, 'never a Payload session').not.toContain('payload-token')

  // A reload keeps the session: the account is the server's answer, not the form's state.
  await page.reload()
  await expect(page.getByText(`Welcome, ${PARTNER.name}.`)).toBeVisible()
  for (const viewport of WIDTHS) {
    await page.setViewportSize(viewport)
    await page.getByText(`Welcome, ${PARTNER.name}.`).scrollIntoViewIfNeeded()
    await noOverflow(page, `partner account at ${viewport.width}`)
    await axeClean(page, `partner account at ${viewport.width}`)
    await page.screenshot({
      path: shot(`partner-signed-in-${viewport.width}`, test.info().outputDir),
    })
  }

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in to your prices.' })).toBeVisible()
  await page.reload()
  await expect(page.getByText(`Welcome, ${PARTNER.name}.`)).toHaveCount(0)
  await record('partner', { refusedWrongPassword: true, signedIn: true, signedOut: true, cookies })
})
