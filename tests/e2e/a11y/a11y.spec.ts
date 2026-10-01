/**
 * axe on every shell page of the brand a project's server runs (TASKS.md 5.6.e, gate M1 —
 * playwright.config.ts's promise that the e2e specs assert accessibility): the home page and the
 * not-found page in each of the brand's locales, at a phone's 390 px and a desktop's 1280 px, each
 * with no axe violation at all (every rule axe runs by default, best practices included).
 *
 * Storefront pages only: Payload's own admin UI is not axe clean yet (the foundation gate's F6,
 * TASKS.md 23.x), so `/admin` is left to that task rather than excused here.
 *
 * What the brand is — its locales — comes from its committed config (the project's `metadata`,
 * as the smoke reads it), never from this file. The viewport is set per case, so one desktop
 * project per server covers both widths.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type TestInfo } from '@playwright/test'

import type { SmokeMetadata } from '../../../playwright.config'

type BrandFacts = {
  readonly locales: { readonly default: string; readonly supported: readonly string[] }
}

const REPO = fileURLToPath(new URL('../../..', import.meta.url))
const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const
/** A path no shell serves, so the not-found page renders with its 404. */
const MISSING = 'a11y-no-such-page'

function localesOf(testInfo: TestInfo): BrandFacts['locales'] {
  const { brandRoot, configFile } = testInfo.project.metadata as SmokeMetadata
  const path = join(REPO, brandRoot, 'site', configFile)
  return (JSON.parse(readFileSync(path, 'utf8')) as BrandFacts).locales
}

/** The default locale is unprefixed (ARCHITECTURE.md §11); every other one is `/<locale>`. */
const prefixOf = (locales: BrandFacts['locales'], locale: string) =>
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
