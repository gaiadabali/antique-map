/**
 * axe on every shell page of the site a project's host serves (TASKS.md 5.6.e, 2.2 — gate M1,
 * playwright.config.ts's promise that the e2e specs assert accessibility): the home page and the
 * not-found page in each of the site's locales, at a phone's 390 px and a desktop's 1280 px, each
 * with no axe violation at all (every rule axe runs by default, best practices included).
 *
 * Storefront pages only: Payload's own admin UI is not axe clean yet (the foundation gate's F6,
 * TASKS.md 23.x), so `/admin` is left to that task rather than excused here.
 *
 * What the site is — its locales — comes from `SITES` (the project's `metadata`, as the smoke
 * reads it), never from this file. The viewport is set per case, so one desktop project per host
 * covers both widths.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type TestInfo } from '@playwright/test'

import type { SmokeMetadata } from '../../../playwright.config'

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const
/**
 * The not-found route, asked for by name: the proxy rewrites it with a 404 and the designed page
 * renders inside the site's shell. A one-segment path a CMS page will own (`a11y-no-such-page`) is
 * instead Next's recovery document — empty body, no `lang`, UI built only in the browser — until
 * its designed surface lands (22.4.e; the Cache Components spike §8).
 */
const MISSING = 'not-found'

function localesOf(testInfo: TestInfo): SmokeMetadata['locales'] {
  return (testInfo.project.metadata as SmokeMetadata).locales
}

/** The default locale is unprefixed (ARCHITECTURE.md §11); every other one is `/<locale>`. */
const prefixOf = (locales: SmokeMetadata['locales'], locale: string) =>
  locale === locales.default ? '' : `/${locale}`

const PAGES = [
  { page: 'home', path: (prefix: string) => prefix || '/', status: 200 },
  { page: 'not-found', path: (prefix: string) => `${prefix}/${MISSING}`, status: 404 },
] as const

for (const viewport of WIDTHS) {
  for (const { page: name, path, status } of PAGES) {
    test(`${name} has no axe violation in every locale at ${viewport.width} px`, async ({
      page,
    }, testInfo) => {
      const locales = localesOf(testInfo)
      await page.setViewportSize(viewport)
      for (const locale of locales.supported) {
        const url = path(prefixOf(locales, locale))
        const response = await page.goto(url)
        expect(response?.status(), url).toBe(status)
        await expect(page.locator('html')).toHaveAttribute('lang', locale)
        const { violations } = await new AxeBuilder({ page }).analyze()
        const found = violations.map(
          ({ id, impact, nodes }) =>
            `${impact ?? 'unknown'} ${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`,
        )
        expect(found, `${url} at ${viewport.width} px`).toEqual([])
      }
    })
  }
}
