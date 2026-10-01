/**
 * The proxy's small readers (`./decide`): C13's root-file patterns, the module a parsed page
 * needs, the reserved not-found segment, and a request's User-Agent and cookies. Pure.
 */
import {
  ACCOUNT_SECTIONS,
  FORM_KINDS,
  hasSurface,
  surfaceModules,
  type ParsedPath,
} from '@engine/config/routes'
import {
  hasModule,
  LOCALE_CODES,
  type LocaleCode,
  type ModuleFlags,
  type ModuleKey,
} from '@engine/config/schema'

import { ROOT_REWRITES } from '../manifest'

/**
 * The internal not-found route's segment, under each locale: `/<locale>/not-found`. The proxy
 * rewrites every path that names no page here with C13's `PROXY_NOT_FOUND_STATUS`, which Next
 * keeps through a normal render, so the route's page (`(site)/[locale]/not-found/page.tsx`) can
 * render the designed NotFound surface in its own body — the `(site)` layout, its masthead,
 * `lang`, a search form, without JavaScript — rather than call `notFound()`, whose answer is
 * Next's empty recovery document (DESIGN-SYSTEM.md §2; the page's switch is TASKS.md 22.4.e). No
 * public URL reaches it except as a rewrite: asked for directly, in any locale, it is itself not
 * found.
 */
export const NOT_FOUND_SEGMENT = 'not-found'

export function notFoundPath(locale: LocaleCode): string {
  return `/${locale}/${NOT_FOUND_SEGMENT}`
}

/** The public path names the not-found route itself: `/not-found`, `/id/not-found`, …. */
export function namesNotFoundRoute(pathname: string): boolean {
  const parts = pathname.split('/').filter((part) => part !== '')
  const first = parts[0] ?? ''
  const head = (LOCALE_CODES as readonly string[]).includes(first) ? parts[1] : first
  try {
    return head !== undefined && decodeURIComponent(head).toLowerCase() === NOT_FOUND_SEGMENT
  } catch {
    return false
  }
}

type SurfaceMatch = Extract<ParsedPath, { kind: 'surface' }>

/**
 * The module a parsed page needs and the brand has off, or `null`. A config may keep a segment
 * for a module it turns off (C1), so the route map alone does not say the page is closed: its
 * surface (C10 `hasSurface()`, which reads a surface two modules share — the account area, open
 * while either account module is), its form kind or its account section does.
 */
export function closedModule(
  config: { readonly modules: ModuleFlags },
  parsed: SurfaceMatch,
): ModuleKey | null {
  const off = (row: object): ModuleKey | null =>
    'module' in row && !hasModule(config, row.module as ModuleKey)
      ? (row.module as ModuleKey)
      : null
  if (!hasSurface(config, parsed.surface)) return surfaceModules(parsed.surface)[0] ?? null
  if (parsed.surface === 'form') return off(FORM_KINDS[parsed.params.kind])
  if (parsed.surface === 'account' && parsed.params.section) {
    return off(ACCOUNT_SECTIONS[parsed.params.section])
  }
  return null
}

/** A `ROOT_REWRITES` target for the path, its `:params` filled; `:favicon` is the brand's. */
export function rootRewrite(favicon: string, pathname: string): string | null {
  for (const { from, to } of ROOT_REWRITES) {
    const match = compile(from).exec(pathname)
    if (!match) continue
    const values: Record<string, string> = { ...match.groups, favicon }
    return to.replace(/:(\w+)\*?/g, (whole, name: string) => values[name] ?? whole)
  }
  return null
}

const compiled = new Map<string, RegExp>()
/** `/sitemap-:name.xml` → `^/sitemap-(?<name>[^/]+?)\.xml$`; `:path*` takes the rest. */
function compile(pattern: string): RegExp {
  let regex = compiled.get(pattern)
  if (!regex) {
    const source = pattern
      .split(/(:\w+\*?)/)
      .map((part) => {
        const param = /^:(\w+)(\*)?$/.exec(part)
        if (!param) return part.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
        return param[2] ? `(?<${param[1]}>.*)` : `(?<${param[1]}>[^/]+?)`
      })
      .join('')
    regex = new RegExp(`^${source}$`)
    compiled.set(pattern, regex)
  }
  return regex
}

/**
 * The request carries a `User-Agent` of its own. Missing and empty are one to Next
 * (`req.headers['user-agent'] || ''`), and a value of blanks is empty once HTTP trims it.
 */
export function hasUserAgent(headers: Headers): boolean {
  return (headers.get('user-agent') ?? '').trim() !== ''
}

export function hasCookie(headers: Headers, name: string): boolean {
  return (headers.get('cookie') ?? '').split(';').some((pair) => pair.trim().startsWith(`${name}=`))
}
