/**
 * The home's hero changed at a person's pace, with the preview open (the plan's §6: ≤ 1:00; TASKS.md
 * 27.7.b): Content › Pages, the Home searched for and opened, the first section ("Hero — home")
 * unfolded, a new title typed, a picture chosen from the media already uploaded, Save Draft (the
 * preview redraws the site's own page), the new title seen in the preview, Publish changes. The page
 * is put back as it was afterwards (off the clock). `shop-admin-timed.spec.ts` keeps the time.
 */
import { expect, type Page, type TestInfo } from '@playwright/test'

import { Human } from '../admin-usability/human/pace'

type Shot = (page: Page, name: string) => Promise<void>

/** The admin's REST from inside the signed-in page (its cookie and origin). */
const rest = (page: Page, method: 'GET' | 'PATCH', path: string, body?: unknown) =>
  page.evaluate(
    async ({ method, path, body }) => {
      const res = await fetch(path, {
        method,
        credentials: 'include',
        headers: body === undefined ? {} : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      return { status: res.status, json: (await res.json()) as Record<string, unknown> }
    },
    { method, path, body },
  )

export async function heroTask(page: Page, info: TestInfo, shot: Shot): Promise<Human> {
  const home = await rest(page, 'GET', '/api/pages?where[slug][equals]=home&depth=0&locale=en')
  const doc = (home.json.docs as { id: number; layout: { blockType: string }[] }[])[0]!
  expect(doc.layout[0]?.blockType, 'the home opens on its hero').toBe('homeHero')
  const title = `Old maps for new rooms ${Date.now() % 100}`
  // Off the clock, the starting point a person meets: the published home, no draft over it, its
  // hero without a chosen picture (the picture the person then chooses).
  const start = doc.layout.map((block, n) => (n === 0 ? { ...block, image: null } : block))
  const reset = await rest(page, 'PATCH', `/api/pages/${doc.id}?locale=en`, {
    layout: start,
    _status: 'published',
  })
  expect(reset.status).toBe(200)

  await page.goto('/admin')
  await page.waitForLoadState('networkidle')
  const h = new Human(page, info, 'hero', 'Change the home hero’s picture and title', 60)
  await h.start()
  await h.click(page.locator('nav a#nav-pages'))
  await h.read()
  // The list is newest first, the Home among the other pages: the person searches for it.
  await h.type(page.locator('#search-filter-input'), 'Home')
  await h.read(1)
  await h.click(page.getByRole('link', { name: 'Home', exact: true }).first())
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible()
  await h.read()
  // The preview opens beside the form (Payload keeps it open once a person has opened it).
  const frame = page.locator('iframe#live-preview-iframe')
  const shown = await frame
    .waitFor({ state: 'visible', timeout: 8_000 })
    .then(() => true)
    .catch(() => false)
  if (!shown) {
    await h.click(page.locator('#live-preview-toggler'))
  }
  await expect(frame).toBeVisible()
  await expect(frame).toHaveAttribute('title', /Preview/)
  // Payload remembers which sections a person left open: unfold the hero only when it is folded.
  const field = page.locator('#field-layout__0__title')
  const open = await field
    .waitFor({ state: 'visible', timeout: 4_000 })
    .then(() => true)
    .catch(() => false)
  if (!open) {
    await h.click(
      page.locator('#field-layout').getByRole('button', { name: 'Toggle block' }).first(),
    )
  }
  await expect(field).toBeVisible()
  await h.type(field, title, { replace: true })
  const picture = page.locator('#field-layout__0__image')
  await h.click(picture.getByRole('button', { name: 'Choose from existing' }))
  const drawer = page.locator('.drawer__content, .list-drawer').last()
  await h.read(1.5)
  const pick = drawer.locator('.table tbody tr').first().locator('button, a').first()
  await h.click(pick)
  await expect(picture.locator('.file-details, .upload-relationship-details').first()).toBeVisible()
  // The preview is the site's own page (server-side Live Preview): a draft save redraws it, and
  // the person looks at it there before publishing.
  await h.click(page.locator('#action-save-draft'))
  const seen = page.frameLocator('iframe#live-preview-iframe').getByRole('heading', { name: title })
  await expect(seen).toBeVisible({
    timeout: 30_000,
  })
  await h.read(2)
  await h.click(page.locator('#action-save'))
  // Done when the published page holds the new title (the draft's toast may still be showing).
  await expect
    .poll(
      async () => {
        const live = await rest(page, 'GET', `/api/pages/${doc.id}?depth=0&locale=en`)
        return (live.json.layout as { title?: string }[] | undefined)?.[0]?.title
      },
      { timeout: 30_000, intervals: [250] },
    )
    .toBe(title)
  h.stop()
  await shot(page, 'timed-hero-preview-1280')

  // Off the clock: published as typed, then the page as it was.
  const after = await rest(page, 'GET', `/api/pages/${doc.id}?depth=0&locale=en`)
  const hero = (after.json.layout as { title?: string; image?: unknown }[])[0]!
  expect(hero.title).toBe(title)
  expect(hero.image).toBeTruthy()
  expect(after.json._status).toBe('published')
  const restored = await rest(page, 'PATCH', `/api/pages/${doc.id}?locale=en`, {
    layout: doc.layout,
    _status: 'published',
  })
  expect(restored.status).toBe(200)
  return h
}
