/**
 * Build the `redirects` rows from a legacy URL inventory and the seeded works.
 *
 * Each row has `site`, `from`, `to`, `code` and `source`. A 410 (DATA.md §6 says
 * "gone" when no field is named) is represented as `code: 410` and `to: ''`.
 * The builder fails loudly on duplicate `from` per site or on a chain where a
 * row's `to` is another row's `from`.
 */
import { redirectKey, type SiteKey } from './normalise'
import { resolveRule, type RuleContext, type WorkLookup } from './rules'

export type RedirectRow = {
  readonly site: SiteKey
  readonly from: string
  readonly to: string
  readonly code: 301 | 302 | 410
  readonly source: 'legacy' | 'editor' | 'slug-change'
}

export type RedirectInput = {
  readonly site: SiteKey
  readonly urls: readonly string[]
  readonly works: readonly WorkLookup[]
  readonly categories: Readonly<Record<string, string>>
}

export type RedirectBuildResult = {
  readonly rows: readonly RedirectRow[]
  readonly gone: readonly string[]
  readonly unresolved: readonly { readonly from: string; readonly reason: string }[]
}

function rowOf(site: SiteKey, from: string, to: string, code: 301 | 302 | 410): RedirectRow {
  return {
    site,
    from,
    to,
    code,
    source: code === 410 ? ('legacy' as const) : ('legacy' as const),
  }
}

/**
 * Build redirects from an inventory of raw legacy URLs. The inventory strings
 * may include host and scheme; only the same-origin path+query is kept.
 */
export function buildRedirects(input: RedirectInput): RedirectBuildResult {
  const { site, urls, works, categories } = input
  const ctx: RuleContext = { site, works, categories }

  const rows: RedirectRow[] = []
  const gone: string[] = []
  const unresolved: { from: string; reason: string }[] = []
  const fromSet = new Set<string>()

  for (const raw of urls) {
    const parsed = parseLegacyUrl(site, raw)
    if (parsed === null) {
      unresolved.push({ from: raw, reason: 'unparsable or foreign URL' })
      continue
    }
    const { path, search, key: from } = parsed

    if (fromSet.has(from)) {
      throw new Error(`duplicate "from" for ${site}: ${from}`)
    }
    fromSet.add(from)

    const decision = resolveRule(site, path, search, ctx)
    if (decision.kind === 'redirect') {
      if (decision.to === from) {
        throw new Error(`self-loop for ${site}: ${from} → ${decision.to}`)
      }
      rows.push(rowOf(site, from, decision.to, decision.code))
    } else if (decision.kind === 'gone') {
      gone.push(from)
      rows.push(rowOf(site, from, '', 410))
    } else {
      unresolved.push({ from, reason: decision.reason })
    }
  }

  const chained = rows.find((r) => r.code !== 410 && fromSet.has(r.to))
  if (chained) {
    throw new Error(
      `redirect chain found for ${site}: ${chained.from} → ${chained.to} is also a "from"`,
    )
  }

  return {
    rows: Object.freeze(rows.slice()),
    gone: Object.freeze(gone.slice()),
    unresolved: Object.freeze(unresolved.slice()),
  }
}

function parseLegacyUrl(
  site: SiteKey,
  raw: string,
): { key: string; path: string; search: string } | null {
  let pathname: string
  let search: string
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
      ? raw
      : `http://host${raw.startsWith('/') ? '' : '/'}${raw}`
    const url = new URL(withScheme)
    pathname = url.pathname
    search = url.search
  } catch {
    return null
  }
  const key = redirectKey(site, pathname, search)
  const path = key.split('?')[0] ?? key
  return { key, path, search: key.slice(path.length + 1) }
}
