/**
 * The route-map and text rules of `validateBrandConfigs()` (C1's header list): every supported
 * locale has a segment map holding a segment for every surface and form kind whose module is
 * on, and text in the default locale; every menu floor links somewhere `href()` can build
 * (C10 throws for a surface whose module is off); a brand's display face is declared.
 */
import {
  FORM_KINDS,
  SEGMENT_SURFACES,
  SURFACE_ROUTES,
  type FormKind,
  type RouteTarget,
} from '../../routes'
import { hasModule, type BrandConfig, type LocalisedText, type ModuleKey } from '../../schema'
import type { ConfigPath, Report } from '../issues'

export function checkRoutes(config: BrandConfig, report: Report): void {
  checkSegments(config, report)
  checkDefaultText(config, report)
  checkNavigation(config, report)
  checkFacetVocabulary(config, report)
  checkDisplayFont(config, report)
}

function gate(row: object): ModuleKey | null {
  return 'module' in row ? (row.module as ModuleKey) : null
}

function checkSegments(config: BrandConfig, report: Report): void {
  for (const locale of config.locales.supported) {
    const segments = config.routes[locale]
    if (!segments) {
      report(
        ['routes', locale],
        `is missing: "${locale}" is a supported locale, so it needs a segment map`,
      )
      continue
    }
    for (const surface of SEGMENT_SURFACES) {
      const module = gate(SURFACE_ROUTES[surface])
      if (module && hasModule(config, module) && segments[surface] === undefined) {
        report(['routes', locale, surface], `needs a segment: its module "${module}" is on`)
      }
    }
    for (const kind of Object.keys(FORM_KINDS) as FormKind[]) {
      const module = gate(FORM_KINDS[kind])
      if (module && hasModule(config, module) && segments.forms[kind] === undefined) {
        report(['routes', locale, 'forms', kind], `needs a segment: its module "${module}" is on`)
      }
    }
  }
}

function checkDefaultText(config: BrandConfig, report: Report): void {
  const locale = config.locales.default
  const need = (text: LocalisedText, path: ConfigPath) => {
    if (text[locale] === undefined) {
      report(
        [...path, locale],
        `needs the default locale's text: "${locale}" is served at the root`,
      )
    }
  }
  if (config.identity.announcement) need(config.identity.announcement, ['identity', 'announcement'])
  for (const where of ['header', 'footer'] as const) {
    config.identity.navigation[where].forEach((item, i) => {
      need(item.label, ['identity', 'navigation', where, i, 'label'])
    })
  }
}

function checkNavigation(config: BrandConfig, report: Report): void {
  for (const where of ['header', 'footer'] as const) {
    config.identity.navigation[where].forEach((item: RouteTarget, i) => {
      const path = ['identity', 'navigation', where, i]
      if (item.surface === 'home') return
      if (item.surface === 'page') {
        if (item.slug === undefined)
          report([...path, 'slug'], 'a "page" link needs the slug of its CMS page')
        return
      }
      const module = gate(SURFACE_ROUTES[item.surface])
      if (module && !hasModule(config, module)) {
        report(
          [...path, 'surface'],
          `links to "${item.surface}", whose module "${module}" is off, so the link would lead nowhere`,
        )
      }
    })
  }
}

function checkFacetVocabulary(config: BrandConfig, report: Report): void {
  const [first] = config.routes.facets.path
  if (first === undefined) return
  for (const locale of config.locales.supported) {
    if (config.routes.facets.vocabularies[first]?.[locale] === undefined) {
      report(
        ['routes', 'facets', 'vocabularies', first, locale],
        `is missing: a named browse URL starts with a ${first} segment, which "${locale}" must be able to spell`,
      )
    }
  }
}

function checkDisplayFont(config: BrandConfig, report: Report): void {
  const stack = config.tokens['--font-display']
  if (stack === undefined) return
  const family =
    stack
      .split(',')[0]
      ?.trim()
      .replace(/^['"]|['"]$/g, '') ?? ''
  if (!config.assets.fonts.some((font) => font.family === family)) {
    report(
      ['tokens', '--font-display'],
      `starts with "${family}", which assets.fonts does not declare: a brand's display face loads at runtime from its own folder`,
    )
  }
}
