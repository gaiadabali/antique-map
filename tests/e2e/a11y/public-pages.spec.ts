/**
 * The public pages' accessibility pass (TASKS.md 10.2.b), both sites: axe with every rule, at 390
 * and 1280 px, in English and Indonesian; a keyboard walk (Tab order, accessible names, visible
 * focus, nothing hidden behind another element, no trap) and the accessibility tree of each page
 * in English. The pages are discovered from the live listing, never named: a listing's first item
 * is whatever is published.
 *
 * `A11Y_ORIGIN` points the same pass at another origin (staging); the project's own host otherwise.
 * Evidence lands under `docs/gates/performance/a11y/` and `…/shots/`.
 */
import { expect, test, type Page } from '@playwright/test'

import type { SmokeMetadata } from '../../../playwright.config'
import {
  axeBothWidths,
  ariaTree,
  shoot,
  slug,
  tabWalk,
  walkMarkdown,
  writeEvidence,
  WIDTHS,
  type AxeRecord,
} from './audit'

type Target = { readonly name: string; readonly path: string }

async function firstItemPath(page: Page, origin: string, listing: string): Promise<string> {
  await page.goto(`${origin}${listing}`)
  const href = await page
    .locator('main a[href^="/product/"]')
    .first()
    .getAttribute('href', { timeout: 15000 })
  expect(href, `an item link on ${listing}`).not.toBeNull()
  return href!
}

test('public pages: axe, keyboard walk and accessibility tree', async ({
  page,
  baseURL,
}, testInfo) => {
  test.setTimeout(600000)
  const meta = testInfo.project.metadata as SmokeMetadata
  const site = meta.site
  const origin = (process.env.A11Y_ORIGIN ?? baseURL ?? '').replace(/\/$/, '')
  const listing = site === 'gallery' ? '/browse' : '/shop'
  const item = await firstItemPath(page, origin, listing)

  const english: Target[] = [
    { name: 'home', path: '/' },
    { name: 'listing', path: listing },
    { name: 'item', path: item },
    { name: 'search', path: '/search?q=map' },
    ...(site === 'gallery' ? [{ name: 'sell-to-us', path: '/sell-to-us' }] : []),
  ]
  // The Indonesian address of the item is the one its own page names (`rel="alternate"`).
  await page.goto(`${origin}${item}`)
  const alternate = await page.locator('link[rel="alternate"][hreflang="id"]').getAttribute('href')
  const idItem = alternate === null ? `/id${item}` : new URL(alternate).pathname
  const indonesian: Target[] = [
    { name: 'home-id', path: '/id' },
    { name: 'item-id', path: idItem },
  ]

  const axe: AxeRecord[] = []
  let keyboard = `## ${site}: keyboard walk, English\n\n`
  const trees: string[] = []

  for (const target of [...english, ...indonesian]) {
    const response = await page.goto(`${origin}${target.path}`)
    expect.soft(response?.status(), target.path).toBe(200)
    await page.waitForLoadState('load')
    axe.push(...(await axeBothWidths(page, `${site} ${target.name}`)))
    if (indonesian.includes(target)) continue
    for (const viewport of WIDTHS) {
      await page.setViewportSize(viewport)
      await shoot(page, `${site}-${slug(target.name)}-${viewport.width}`)
    }
    await page.setViewportSize(WIDTHS[0])
    await ariaTree(page, `${site}-${slug(target.name)}`)
    trees.push(target.name)
    for (const viewport of WIDTHS) {
      await page.setViewportSize(viewport)
      const walk = await tabWalk(page)
      keyboard += walkMarkdown(target.name, viewport.width, walk)
      expect
        .soft(walk.problems, `${site} ${target.name} keyboard at ${viewport.width} px`)
        .toEqual([])
    }
    await page.setViewportSize(WIDTHS[0])
  }

  writeEvidence(`a11y/axe-${site}.json`, `${JSON.stringify(axe, null, 2)}\n`)
  writeEvidence(`a11y/keyboard-${site}.md`, keyboard)
  expect(trees.length).toBeGreaterThan(0)
})
