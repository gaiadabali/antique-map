/**
 * A store user added by the owner and signed in, at a person's pace (TASKS.md 27.6.d; the plan's
 * §6: ≤ 1:00). The owner opens Settings › Staff › Add a staff member from the admin's home — store
 * staff already chosen — finds the store by typing part of its code in the store finder (TASKS.md
 * 27.7: the seed's 120 stores all begin "Seed store, …", which a list's type-ahead made slow),
 * types the name, the email and the password they choose, and adds the account (no email
 * invitation: the user's choice, 2026-11-09); the new person then signs in on their own device and
 * lands on their orders, offered only Orders and Stock by store. The clock is
 * `admin-usability/human/pace.ts`'s model, both parts added together; the times go to
 * `test-results/staff-timed.json`. The account is removed afterwards.
 */
import { mkdirSync, writeFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

import { Human } from '../admin-usability/human/pace'
import { signIn } from './admin'
import { ACCOUNTS } from './accounts'
import { fixtures, sql } from './local.mjs'

const RESULTS = 'test-results/staff-timed.json'
/** Screenshots beside the results, or in `SITE_SHOTS` when set: never in a gate's folder. */
const shot = (name: string) => `${process.env.SITE_SHOTS ?? 'test-results'}/${name}.png`
const TARGET = 60

test.describe.configure({ mode: 'default' })

test('a store user added by the owner and signed in in ≤ 1:00', async ({ page, browser }, info) => {
  test.setTimeout(240_000)
  const fx = fixtures()
  // An address and a password of everyday length (a staff member's own email, the policy's 12+).
  const email = `wayan${Date.now() % 1000}@oei.test`
  const password = 'Kopi-Ubud-2027'
  await page.setViewportSize({ width: 1280, height: 800 })
  await signIn(page, ACCOUNTS.owner.email)

  // The owner, from the home: Settings › Staff › Add a staff member (store staff preselected).
  await page.goto('/admin')
  const owner = new Human(page, info, 'staff-add', 'Add a store user', TARGET)
  await owner.start()
  await owner.click(page.locator('nav a#nav-users'))
  await owner.read()
  await owner.click(page.getByRole('link', { name: 'Add a staff member' }))
  await owner.read()
  // The store: the owner types its code in the finder (any part of a name, code or area matches),
  // as many characters as leave one store, which is then chosen — no scrolling a list of 120.
  const code = sql(`SELECT code FROM stores WHERE id = ${fx.stores.a.id}`)
  const stores = sql(`SELECT lower(code || ' ' || name || ' ' || coalesce(area, '')) FROM stores`)
  const haystacks = stores.split('\n')
  let typed = 1
  const matches = (n: number) =>
    haystacks.filter((each) => each.includes(code.slice(0, n).toLowerCase())).length
  while (matches(typed) > 1) typed += 1
  await owner.type(page.locator('#staff-store-find'), code.slice(0, typed))
  const select = page.locator('#staff-store')
  await expect(select).toHaveValue(String(fx.stores.a.id))
  await owner.type(page.locator('#staff-name'), 'Wayan Store')
  await owner.type(page.locator('#staff-email'), email)
  await owner.type(page.locator('#staff-password'), password)
  await owner.click(page.getByRole('button', { name: 'Add', exact: true }))
  await expect(page.locator('main [role="status"]')).toContainText('can now sign in', {
    timeout: 20_000,
  })
  owner.stop()
  await page.screenshot({ path: shot('staff-added-1280') })

  // The new person, on their own phone: sign in, land on their orders.
  const context = await browser.newContext({
    baseURL: info.project.use.baseURL,
    viewport: { width: 390, height: 844 },
  })
  const phone = await context.newPage()
  await phone.goto('/admin/login')
  const person = new Human(phone, info, 'staff-sign-in', 'Sign in as the new store user', TARGET)
  await person.start()
  await person.type(phone.locator('#field-email'), email)
  await person.type(phone.locator('#field-password'), password)
  await person.click(phone.locator('button[type="submit"]'))
  await phone.waitForURL(/\/admin\/orders$/, { timeout: 30_000 })
  await expect(phone.locator('h1').first()).toHaveText('Orders')
  person.stop()
  await phone.screenshot({ path: shot('staff-signed-in-390') })

  const seconds = Math.round((owner.seconds() + person.seconds()) * 10) / 10
  const result = {
    seconds,
    target: TARGET,
    owner: { seconds: owner.seconds(), clicks: owner.clicks, keys: owner.keys },
    person: { seconds: person.seconds(), clicks: person.clicks, keys: person.keys },
  }
  mkdirSync('test-results', { recursive: true })
  writeFileSync(RESULTS, `${JSON.stringify(result, null, 2)}\n`)
  console.log(`TIMED staff added and signed in: ${seconds} s (target ${TARGET} s)`)
  await context.close()
  sql(`DELETE FROM users WHERE email = '${email}'`)
  expect(seconds).toBeLessThanOrEqual(TARGET)
})
