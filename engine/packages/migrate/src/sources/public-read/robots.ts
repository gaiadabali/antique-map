/**
 * robots.txt, read the way the reader obeys it (RFC 9309): the group for our
 * product token, else the `*` group; the longest matching rule wins and an
 * `Allow` wins a tie; `*` and `$` are the only wildcards. `Crawl-delay` is not
 * in the RFC, but a site that asks for one gets it — the reader only ever
 * slows down for it, never speeds up (D41: about one request every two
 * seconds is the floor).
 */

export type RobotsRule = { allow: boolean; pattern: string }

export type RobotsPolicy = {
  /** false when robots.txt answered 5xx or could not be read: RFC 9309 §2.3.1.3 — assume disallowed. */
  reachable: boolean
  rules: RobotsRule[]
  crawlDelaySeconds: number | null
  sitemaps: string[]
}

export const ALLOW_ALL: RobotsPolicy = {
  reachable: true,
  rules: [],
  crawlDelaySeconds: null,
  sitemaps: [],
}
export const DISALLOW_ALL: RobotsPolicy = {
  reachable: false,
  rules: [{ allow: false, pattern: '/' }],
  crawlDelaySeconds: null,
  sitemaps: [],
}

type Group = { agents: string[]; rules: RobotsRule[]; crawlDelay: number | null }

/** Parses robots.txt for `productToken` (the first word of our User-Agent, lower-cased). */
export function parseRobots(text: string, productToken: string): RobotsPolicy {
  const token = productToken.toLowerCase()
  const groups: Group[] = []
  const sitemaps: string[] = []
  let current: Group | null = null
  let lastWasAgent = false

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    const colon = line.indexOf(':')
    if (colon <= 0) continue
    const field = line.slice(0, colon).trim().toLowerCase()
    const value = line.slice(colon + 1).trim()

    if (field === 'user-agent') {
      // Consecutive User-agent lines share one group.
      if (!lastWasAgent || current === null) {
        current = { agents: [], rules: [], crawlDelay: null }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
      continue
    }
    lastWasAgent = false
    if (field === 'sitemap') {
      if (value) sitemaps.push(value)
      continue
    }
    if (current === null) continue
    if (field === 'allow' || field === 'disallow') {
      // An empty Disallow allows everything; it adds no rule.
      if (value) current.rules.push({ allow: field === 'allow', pattern: value })
    } else if (field === 'crawl-delay') {
      const seconds = Number(value)
      if (Number.isFinite(seconds) && seconds >= 0) current.crawlDelay = seconds
    }
  }

  const matching = groups.filter((group) => group.agents.some((agent) => agent === token))
  const chosen = matching.length > 0 ? matching : groups.filter((g) => g.agents.includes('*'))
  const rules = chosen.flatMap((group) => group.rules)
  const delays = chosen.map((group) => group.crawlDelay).filter((d): d is number => d !== null)
  return {
    reachable: true,
    rules,
    crawlDelaySeconds: delays.length > 0 ? Math.max(...delays) : null,
    sitemaps,
  }
}

function patternToRegExp(pattern: string): RegExp {
  const anchored = pattern.endsWith('$')
  const body = anchored ? pattern.slice(0, -1) : pattern
  const escaped = body
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${escaped}${anchored ? '$' : ''}`)
}

/** Whether `pathAndQuery` (e.g. `/category/1-x?page=2`) may be fetched. */
export function isAllowed(policy: RobotsPolicy, pathAndQuery: string): boolean {
  if (pathAndQuery === '/robots.txt') return true
  let best: { length: number; allow: boolean } | null = null
  for (const rule of policy.rules) {
    if (!patternToRegExp(rule.pattern).test(pathAndQuery)) continue
    const length = rule.pattern.length
    if (best === null || length > best.length || (length === best.length && rule.allow)) {
      best = { length, allow: rule.allow }
    }
  }
  return best === null ? true : best.allow
}
