/**
 * 10.3.b, gallery journey on staging: search a work, open it, Ask (the wa.me link carries the item),
 * leave a lead through the contact form (marked REHEARSAL 10.3), then confirm the lead exists as
 * the owner (REST read on the admin host). The owner read needs E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD;
 * without them that step fails with a BLOCKED message, never a skip.
 */
import { expect, test } from '@playwright/test'

import {
  GALLERY,
  need,
  record,
  REHEARSAL_NAME,
  rehearsalEmail,
  SHOP,
  shoot,
  widthOf,
} from './support'

test.describe.serial('gallery: search → item → Ask → lead', () => {
  let itemPath = ''
  let itemTitle = ''
  let email = ''

  test('search finds a work and opens an available item', async ({ page }, info) => {
    const home = await page.goto(`${GALLERY}/`, { waitUntil: 'load' })
    expect(home?.status(), 'home').toBe(200)
    await page.goto(`${GALLERY}/search`, { waitUntil: 'load' })
    await page.getByLabel('Search for', { exact: true }).fill('Batavia')
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await expect(page).toHaveURL(/\/search\?.*q=Batavia/)
    const links = page.locator('main a[href^="/product/"]')
    await expect(links.first(), 'the search lists works').toBeVisible()
    await shoot(page, info, 'gallery-1-search')
    const hrefs = [
      ...new Set(
        await links.evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).pathname)),
      ),
    ]
    expect(hrefs.length, 'search results for Batavia').toBeGreaterThan(0)
    // Selection, not assertion: take the first result whose panel says available.
    let chosen: string | null = null
    for (const path of hrefs.slice(0, 12)) {
      const res = await page.goto(`${GALLERY}${path}`, { waitUntil: 'load' })
      if (res?.status() === 200 && (await page.locator('[data-status="available"]').count()) > 0) {
        chosen = path
        break
      }
    }
    expect(chosen, 'an available work among the first results').not.toBeNull()
    itemPath = chosen!
    itemTitle = (await page.getByRole('heading', { level: 1 }).innerText()).trim()
    expect(itemTitle.length).toBeGreaterThan(0)
    await expect(page.locator('[data-status="available"]')).toBeVisible()
    await shoot(page, info, 'gallery-2-item')
    record({ kind: 'gallery-item', width: widthOf(info), path: itemPath, title: itemTitle })
  })

  test('Ask hands off to WhatsApp carrying the item', async ({ page }, info) => {
    await page.goto(`${GALLERY}${itemPath}`, { waitUntil: 'load' })
    const ask = page.getByRole('link', { name: 'Ask about this' })
    await expect(ask).toBeVisible()
    const url = new URL((await ask.getAttribute('href')) as string)
    expect(url.origin, 'the handoff is wa.me').toBe('https://wa.me')
    expect(url.pathname, 'a number, digits only').toMatch(/^\/\d{8,}$/)
    const text = url.searchParams.get('text') ?? ''
    expect(text, 'the prepared message names the work').toContain(itemTitle)
    expect(text, 'the prepared message carries the item address').toContain(itemPath)
    await shoot(page, info, 'gallery-3-ask')
  })

  test('the lead form takes a REHEARSAL lead (201)', async ({ page }, info) => {
    email = rehearsalEmail('gallery', widthOf(info))
    await page.goto(`${GALLERY}/contact`, { waitUntil: 'load' })
    await page.getByLabel('Your name').fill(REHEARSAL_NAME)
    await page.getByLabel('Email address').fill(email)
    await page
      .getByLabel('What would you like to ask?')
      .fill(`REHEARSAL 10.3 (launch rehearsal, ignore). About ${itemTitle} — ${itemPath}`)
    await page.getByLabel(/I agree that Indies Gallery/).check()
    await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, {
      timeout: 30_000,
    })
    await shoot(page, info, 'gallery-4-lead-form')
    const posted = page.waitForResponse((r) => r.url().endsWith('/api/x/leads'))
    await page.getByRole('button', { name: 'Send message' }).click()
    expect((await posted).status(), 'the route accepts the lead').toBe(201)
    await expect(page.getByText('Thank you — we have your message.')).toBeVisible()
    await shoot(page, info, 'gallery-5-thank-you')
  })

  test('the lead exists, read as the owner', async ({ request }, info) => {
    const creds = need('E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD')
    const login = await request.post(`${SHOP}/api/users/login`, {
      data: { email: creds.E2E_OWNER_EMAIL, password: creds.E2E_OWNER_PASSWORD },
    })
    expect(login.status(), 'the owner signs in').toBe(200)
    const { token } = (await login.json()) as { token: string }
    const res = await request.get(
      `${SHOP}/api/leads?where[payload.email][equals]=${encodeURIComponent(email)}&depth=0`,
      { headers: { Authorization: `JWT ${token}` } },
    )
    expect(res.status()).toBe(200)
    const { docs } = (await res.json()) as {
      docs: { id: number; kind: string; site: string; payload: { name: string } }[]
    }
    expect(docs, 'exactly one lead for the one send').toHaveLength(1)
    expect(docs[0]).toMatchObject({ site: 'gallery', payload: { name: REHEARSAL_NAME } })
    record({ kind: 'gallery-lead', width: widthOf(info), leadId: docs[0]!.id, email })
  })
})
