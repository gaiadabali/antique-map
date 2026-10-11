/**
 * T1 (recipe 3.1, target 5 min with the AI draft, 8 without), at a person's pace: an antique from six photos,
 * drafted by the AI, checked, completed and published. The six photos are views of one real staging sheet.
 * Off the clock: drafting is switched on for the gallery before and back off after, and the antique is
 * unpublished at the end. What the recipe leaves out but publishing needs is noted as a stumble.
 */
import { expect, test, type Page } from '@playwright/test'

import { need, record, RUN, SHOP, sidebarLink, signIn } from '../support'
import { Human } from './pace'
import { addImage, sixViews, stagingPhoto } from './steps'

const ROLES = [/^Recto/, /^Verso/, /^Detail/, /^Raking/, /^Transmitted/, /^Framed/]
const ALTS = [
  'The whole sheet, front',
  'The back of the sheet',
  'Detail, top left',
  'Detail, top right',
  'Detail, lower left',
  'Detail, centre',
]

async function drafting(page: Page, on: boolean): Promise<boolean> {
  await page.goto(`${SHOP}/admin/globals/site-settings`)
  await page.waitForLoadState('networkidle')
  await page.locator('.tabs-field__tab-button', { hasText: 'Indies Gallery' }).first().click()
  const box = page.locator('#field-gallery__ai__draftingEnabled')
  await box.scrollIntoViewIfNeeded()
  const was = await box.isChecked()
  if (was !== on) {
    await box.click()
    await page.getByRole('button', { name: 'Save' }).first().click()
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible()
  }
  return was
}

async function unpublishWork(page: Page, id: number): Promise<void> {
  await page.goto(`${SHOP}/admin/collections/works/${id}`)
  await page.waitForLoadState('networkidle')
  if (
    (await page
      .locator('.doc-controls')
      .getByText(/Status:\s*Published/)
      .count()) === 0
  )
    return
  await page.locator('.doc-controls__popup .popup-button').first().click()
  await page.getByText('Unpublish', { exact: true }).click()
  await page
    .locator('.confirmation-modal')
    .getByRole('button', { name: /confirm|unpublish/i })
    .last()
    .click()
  await page.locator('[data-sonner-toast]').first().waitFor()
}

const empty = async (page: Page, id: string): Promise<boolean> =>
  (
    await page
      .locator(`#${id}`)
      .inputValue()
      .catch(() => '')
  ).trim() === ''

/** A person scrolls the whole form; Payload draws far fields only once they come near the screen. */
async function scrollThrough(h: Human): Promise<void> {
  const page = h.page
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < height + 2000; y += 700) {
    await page.evaluate((top) => window.scrollTo(0, top), y)
    await page.waitForTimeout(350)
  }
}

/** The server's word on whether the antique is published now. */
async function isPublished(page: Page, id: number): Promise<boolean> {
  return page.evaluate(async (workId) => {
    const r = await fetch(`/api/works/${workId}?depth=0&draft=false`)
    return r.ok ? (await r.json())._status === 'published' : false
  }, id)
}

test('T1 add an antique with the AI draft', async ({ page }, info) => {
  const creds = need('E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD')
  await signIn(page, creds.E2E_OWNER_EMAIL!, creds.E2E_OWNER_PASSWORD!)
  const views = await sixViews(page, await stagingPhoto(page, 'work'))
  const draftingWas = await drafting(page, true)
  await page.goto(`${SHOP}/admin?locale=en`)
  await page.waitForLoadState('networkidle')
  const stockNumber = `M.H${RUN.slice(-6)}${Math.floor(Math.random() * 90 + 10)}`
  let aiUsed = false
  let id = 0

  const h = new Human(page, info, 'T1', 'Add an antique with the AI draft', 300)
  try {
    await h.start()
    await h.click(await sidebarLink(page, '/admin/collections/works'))
    await page.waitForURL(/\/collections\/works/)
    await h.read()
    await h.click(page.getByRole('link', { name: 'Create New' }).first())
    await h.read()
    for (let i = 0; i < 6; i += 1) {
      await addImage(h, views[i]!, { alt: ALTS[i]!, subject: /work/i, role: ROLES[i]! })
    }
    await h.type(page.locator('#field-stockNumber'), stockNumber)

    // Step 2: the side panel has no Draft from photographs until the antique is saved once.
    const button = page.getByRole('button', { name: 'Draft from photographs' })
    if ((await button.count()) === 0) {
      h.stumble(
        'no "Draft from photographs" on a new antique: it appears only after Save Draft (the recipe does not say)',
      )
      await h.pause(6)
      await h.click(page.getByRole('button', { name: 'Save Draft' }).first())
      await expect(page).toHaveURL(/\/collections\/works\/\d+/, { timeout: 60_000 })
      await h.read()
    }
    id = Number(/works\/(\d+)/.exec(page.url())?.[1] ?? 0)
    if ((await button.count()) > 0) {
      await h.click(button.first())
      const outcome = await Promise.race([
        page
          .getByRole('button', { name: 'Show the drafted fields' })
          .waitFor({ timeout: 180_000 })
          .then(() => 'done'),
        page
          .getByText(/did not answer|not allowed|switched off|budget|refused|could not/i)
          .first()
          .waitFor({ timeout: 180_000 })
          .then(() => 'refused'),
      ]).catch(() => 'timeout')
      if (outcome === 'done') {
        aiUsed = true
        await h.read(4)
        await h.click(page.getByRole('button', { name: 'Show the drafted fields' }))
        await page.waitForLoadState('networkidle')
        await h.read(3)
        // Step 3: check every suggestion against the object, then tick Verified (further down, in Cataloguing).
        await scrollThrough(h)
        const verify = page.locator('input[id^="field-cataloguing__aiDraft__"][id$="__verified"]')
        const n = await verify.count()
        for (let i = 0; i < n; i += 1) {
          await h.pause(5)
          if (!(await verify.nth(i).isChecked())) await h.click(verify.nth(i))
        }
        h.stumble(`the AI draft filled and asked to verify ${n} field(s)`)
      } else {
        h.stumble(
          `the AI draft did not run (${outcome}): fields filled by hand, the 8-minute target applies`,
        )
      }
    } else {
      h.stumble(
        'no "Draft from photographs" even after saving: fields filled by hand, the 8-minute target applies',
      )
    }

    // What publishing needs and the draft left empty.
    if (await empty(page, 'field-title')) {
      await h.type(page.locator('#field-title'), 'Nova tabula insularum Iavae, a rehearsal sheet')
    }
    if ((await page.locator('#field-objectType').innerText()).includes('Select a value')) {
      await h.pick(page.locator('#field-objectType'), /^Print$/, 'Pri')
    }
    if (
      (
        await page
          .locator('#field-date__precision')
          .innerText()
          .catch(() => '')
      ).includes('Select a value')
    ) {
      h.stumble('the date was empty: precision and year typed by hand')
      await h.pick(page.locator('#field-date__precision'), /year/i)
      await h.type(page.locator('#field-date__from'), '1850')
    }
    if ((await page.locator('[id^="field-makers__"][id$="__maker"]').count()) === 0) {
      h.stumble(
        'no maker after the draft, though the recipe says the tool fills it: added by hand (Add Credit)',
      )
      await h.click(page.getByRole('button', { name: 'Add Credit' }))
      await h.pick(page.locator('#field-makers__0__maker'), /Orbigny/i, 'Orbigny')
      await h.pick(page.locator('#field-makers__0__role'), /./)
      h.stumble('a maker credit also needs a Certainty (required; the recipe does not say)')
      await h.pick(page.locator('#field-makers__0__certainty'), /./)
    }
    const places = page.locator('[id^="field-places__"][id$="__place"]')
    if ((await places.count()) === 0) {
      h.stumble('no place after the draft: added by hand (Add Place) and ticked Primary')
      await h.click(page.getByRole('button', { name: 'Add Place' }))
      await h.pick(page.locator('#field-places__0__place'), /Java/i, 'Java')
      await h.pick(page.locator('#field-places__0__role'), /./)
      await h.click(page.locator('#field-places__0__primary'))
    } else if (!(await page.locator('[id^="field-places__"][id$="__primary"]:checked').count())) {
      h.stumble(
        'the drafted places have none marked Primary: ticked the first (the recipe does not say)',
      )
      await h.click(page.locator('[id^="field-places__"][id$="__primary"]').first())
    }
    // Step 4.
    await h.type(page.locator('#field-dimensions__sheet__height'), '45')
    await h.type(page.locator('#field-dimensions__sheet__width'), '38')
    await h.pick(page.locator('#field-condition__grade'), /./)
    await h.pick(page.locator('#field-location'), /Singapore/i)

    // Step 5: Publish changes; a refusal is read and answered as the message says, at most three times.
    let published = false
    for (let attempt = 0; attempt < 4 && !published; attempt += 1) {
      await h.click(page.getByRole('button', { name: 'Publish changes' }).first())
      // The first toast says Submitting…; the answer replaces it.
      const toast = page
        .locator('[data-sonner-toast]')
        .filter({ hasNotText: /submitting/i })
        .first()
      await toast.waitFor({ timeout: 60_000 })
      const text = (await toast.innerText()).replace(/\s+/g, ' ').trim()
      await h.read(3)
      if (!id) id = Number(/works\/(\d+)/.exec(page.url())?.[1] ?? 0)
      published = id > 0 && (await isPublished(page, id))
      if (published) break
      await scrollThrough(h)
      const fieldErrors = (
        await page
          .locator('.field-error, .tooltip--error, [class*="error-message"]')
          .allInnerTexts()
      )
        .map((t) => t.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
      h.stumble(
        `Publish refused: "${text.slice(0, 240)}"${fieldErrors.length ? `; on the form: ${[...new Set(fieldErrors)].slice(0, 6).join(' | ')}` : ''}`,
      )
      if (/process|derivative/i.test(text)) await h.pause(20)
      else if (/verif/i.test(text + fieldErrors.join(' '))) {
        const left = page.locator(
          'input[id^="field-cataloguing__aiDraft__"][id$="__verified"]:not(:checked)',
        )
        const n = await left.count()
        for (let i = 0; i < n; i += 1) {
          await h.pause(5)
          await h.click(left.first())
        }
      } else break
      await page
        .locator('[data-sonner-toast]')
        .first()
        .waitFor({ state: 'detached', timeout: 15_000 })
        .catch(() => undefined)
    }
    h.stop()
    await h.shot('t1-done')
    h.finish(published ? 'unaided' : 'not_done', { stockNumber, aiUsed, targetWithoutAi: 480 })
    record({ kind: 'human-antique', id, stockNumber, published })
  } finally {
    if (id) await unpublishWork(page, id).catch(() => undefined)
    if (!draftingWas) await drafting(page, false)
  }
})
