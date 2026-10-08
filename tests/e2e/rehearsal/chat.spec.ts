/**
 * 10.3.b, the AI chat on both sites (390 px only: one chat session per site per run, so two runs
 * stay inside the 6 sessions per IP per hour). From an item page: the launcher opens the dialog,
 * one plain question gets a reply, and the WhatsApp handoff carries the item. Patterned on
 * `tests/e2e/chat/walk-82c.mjs`.
 */
import { expect, test, type Locator, type Page } from '@playwright/test'

import { GALLERY, SHOP, shoot } from './support'

const SITES = [
  {
    site: 'gallery',
    url: `${GALLERY}/product/746`,
    item: /Abhimanjoe|P\.1180/i,
    plain: 'Tell me about this piece.',
    wa: 'I would like to ask the gallery about this one on WhatsApp.',
  },
  {
    site: 'shop',
    url: `${SHOP}/product/balinese-legong-dancer-1925`,
    item: /Legong/i,
    plain: 'Tell me about this product.',
    wa: 'Can I ask the team about this on WhatsApp?',
  },
] as const

async function ask(page: Page, dialog: Locator, text: string): Promise<string> {
  const before = await dialog.locator('[data-chat-role="assistant"]').count()
  const box = dialog.getByRole('textbox')
  await box.click()
  await box.fill(text)
  // The Send button, not Enter: with touch emulation Enter left the text unsent.
  await dialog.getByRole('button', { name: 'Send', exact: true }).click()
  await expect
    .poll(() => dialog.locator('[data-chat-role="assistant"]').count(), { timeout: 60_000 })
    .toBeGreaterThan(before)
  // The reply streams: the Send button is a Stop button until it is done.
  await expect(dialog.getByRole('button', { name: 'Stop' })).toHaveCount(0, { timeout: 90_000 })
  const all = await dialog.locator('[data-chat-role="assistant"]').allInnerTexts()
  return all.slice(before).join(' ').replace(/\s+/g, ' ').trim()
}

for (const s of SITES) {
  test(`${s.site}: chat opens, answers a plain question, hands off to WhatsApp with the item`, async ({
    page,
  }, info) => {
    await page.goto(s.url, { waitUntil: 'load' })
    const launcher = page.getByRole('button', { name: /chat with us/i })
    await launcher.click()
    const dialog = page.getByRole('dialog', { name: /chat with us/i })
    await expect(dialog).toBeVisible()
    await shoot(page, info, `chat-${s.site}-1-open`)

    const reply = await ask(page, dialog, s.plain)
    expect(reply.length, 'a reply to the plain question').toBeGreaterThan(20)
    await shoot(page, info, `chat-${s.site}-2-answer`)

    await ask(page, dialog, s.wa)
    const texts = await dialog
      .locator('a[href^="https://wa.me/"]')
      .evaluateAll((as) =>
        as.map((a) =>
          decodeURIComponent(new URL((a as HTMLAnchorElement).href).searchParams.get('text') ?? ''),
        ),
      )
    expect(texts.length, 'a wa.me handoff link in the chat').toBeGreaterThan(0)
    expect(
      texts.some((t) => s.item.test(t)),
      `a handoff text names the item: ${JSON.stringify(texts)}`,
    ).toBe(true)
    await shoot(page, info, `chat-${s.site}-3-handoff`)
  })
}
