/**
 * What the admin roles drive does in the browser (TASKS.md 3.6.d): sign in, switch the admin's
 * language on the profile, read the sidebar, and collect the messages an invalid save shows.
 */
import { expect, test, type Page } from '@playwright/test'

import { savedToken } from '../support/sessions'
import { PASSWORD } from './accounts'

export type Language = 'en' | 'id'

/** What the profile's language select lists each language as (Payload's own names). */
const LANGUAGE_NAMES: Record<Language, RegExp> = { en: /^English$/, id: /Indonesia/ }

/**
 * Signs in as `email`. The account's session from the run's global setup is used when there is one
 * (sign-in is limited to 10 per address per 15 minutes, `support/sessions.ts`); otherwise, or when
 * the saved session is not accepted, the form is filled in as a person would.
 */
export async function signIn(page: Page, email: string): Promise<void> {
  await page.context().clearCookies()
  const token = savedToken(email)
  const base = test.info().project.use.baseURL
  if (token && base) {
    const domain = new URL(base).hostname
    await page.context().addCookies([{ name: 'payload-token', value: token, domain, path: '/' }])
    await page.goto('/admin')
    if (!new URL(page.url()).pathname.endsWith('/login')) return
    await page.context().clearCookies()
  }
  await page.goto('/admin/login')
  await page.locator('#field-email').fill(email)
  await page.locator('#field-password').fill(PASSWORD)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login'))
}

/** Switches the admin's language on the account page, as a person would. */
export async function setLanguage(page: Page, language: Language): Promise<void> {
  await page.goto('/admin/account')
  const select = page.locator('.payload-settings__language .react-select, #field-lng').first()
  await select.click()
  await page.locator('.rs__option').filter({ hasText: LANGUAGE_NAMES[language] }).first().click()
  await expect(page.locator('html')).toHaveAttribute('lang', language)
}

/** The sidebar, opened: each group's title and the entries under it, in the order shown. */
export async function sidebar(page: Page): Promise<Record<string, string[]>> {
  await page.goto('/admin')
  const nav = page.getByRole('complementary').getByRole('navigation').first()
  await expect(nav).toBeAttached()
  // Open it if it is closed (Payload keeps the choice per person), so a screenshot shows it.
  const open = page.getByRole('button', { name: /^(Open Menu|Buka Menu)$/ })
  if (await open.isVisible()) await open.click()
  await expect(page.getByRole('button', { name: /^(Close Menu|Tutup Menu)$/ })).toBeVisible()
  const groups: Record<string, string[]> = {}
  const titled = nav.locator(':scope > div').filter({ has: page.getByRole('button') })
  for (const group of await titled.all()) {
    const title = (await group.getByRole('button').first().innerText()).trim()
    groups[title] = (await group.getByRole('link').allInnerTexts()).map((text) => text.trim())
  }
  return groups
}

/**
 * Picks `option` in the select or relationship field whose input wrapper is `field`. `search`
 * types first: a relationship field only lists its first page unfiltered, which a vocabulary of
 * more than a handful of records (makers, places, terms) may not put `option` on.
 */
export async function choose(
  page: Page,
  field: string,
  option: RegExp | string,
  search?: string,
): Promise<void> {
  await page.locator(`${field} .rs__control`).first().click()
  if (search) await page.keyboard.type(search)
  await page.locator('.rs__option').filter({ hasText: option }).first().click()
}

/** The same, for a field found by its visible label (relationship fields carry no id). */
export async function chooseByLabel(
  page: Page,
  label: RegExp,
  option: RegExp | string,
  search?: string,
): Promise<void> {
  const field = page
    .locator('.field-type')
    .filter({ has: page.locator('.field-label', { hasText: label }) })
  await field.locator('.rs__control').first().click()
  if (search) await page.keyboard.type(search)
  await page.locator('.rs__option').filter({ hasText: option }).first().click()
}

/** The field whose input (or wrapper) is `input`: the nearest `.field-type`, itself included. */
const fieldOf = (page: Page, input: string) =>
  page
    .locator(input)
    .first()
    .locator('xpath=ancestor-or-self::*[contains(concat(" ", @class, " "), " field-type ")][1]')

/** The error message the field holding `input` shows, as one line. */
export async function fieldError(page: Page, input: string): Promise<string> {
  const error = fieldOf(page, input).locator('.field-error').first()
  await expect(error).toBeAttached()
  return ((await error.textContent()) ?? '').replace(/\s+/g, ' ').trim()
}

/** The error toast a refused save shows, as one line (not the "Submitting…" one before it). */
export async function toast(page: Page): Promise<string> {
  const shown = page.locator('[data-sonner-toast][data-type="error"]').first()
  await expect(shown).toBeVisible()
  return (await shown.innerText()).replace(/\s+/g, ' ').trim()
}

/** A GET of Payload's REST from the page itself, with the session's cookie: its status and body. */
export async function rest(page: Page, path: string): Promise<{ status: number; body: unknown }> {
  return page.evaluate(async (url) => {
    const answer = await fetch(url, { credentials: 'include' })
    return { status: answer.status, body: (await answer.json()) as unknown }
  }, path)
}

/** The number a dashboard widget shows, read from its "label: n" link. */
export async function widgetCount(page: Page, href: string): Promise<number | null> {
  const link = page.locator(`a[href="${href}"]`).filter({ hasText: /:\s*\d+$/ })
  if ((await link.count()) === 0) return null
  const text = await link.first().innerText()
  return Number(text.split(':').pop())
}
