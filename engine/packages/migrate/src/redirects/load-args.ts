/**
 * The loader CLI's arguments (9.4load), parsed apart from the CLI so a test can reach them.
 *
 * Bare words, not `--flags`: `payload run` rebuilds `process.argv` from positional arguments
 * only and silently drops every `--flag` (`@engine/cms`'s `db/cli.ts` `argument()` note) — a
 * `--dry-run` would vanish and the run would write. So the mode is a mandatory word, `dry-run` or
 * `apply`: a run that lost its words refuses instead of defaulting to a write, and a `--flag`
 * that did reach this far (another launcher) is refused by name.
 *
 *   <gallery|shop|all> <dry-run|apply> [prune] [unresolved-out=<dir>]
 */
import type { SiteKey } from './normalise'

export const LOAD_USAGE =
  'usage: redirects:load -- <gallery|shop|all> <dry-run|apply> [prune] [unresolved-out=<dir>]'

export type LoadArgs = {
  readonly sites: readonly SiteKey[]
  readonly dryRun: boolean
  readonly prune: boolean
  readonly unresolvedOut: string | null
}

const SITE_WORDS: Readonly<Record<string, readonly SiteKey[]>> = {
  gallery: ['gallery'],
  shop: ['shop'],
  all: ['gallery', 'shop'],
}

export function parseLoadArgs(argv: readonly string[]): LoadArgs {
  let sites: readonly SiteKey[] | null = null
  let mode: 'dry-run' | 'apply' | null = null
  let prune = false
  let unresolvedOut: string | null = null
  for (const word of argv) {
    if (word.startsWith('--')) {
      throw new Error(`"${word}": flags are not read (payload run drops them) — use bare words. ${LOAD_USAGE}`)
    }
    const site = SITE_WORDS[word.startsWith('site=') ? word.slice('site='.length) : word]
    if (site !== undefined) {
      if (sites !== null) throw new Error(`name the site once. ${LOAD_USAGE}`)
      sites = site
    } else if (word === 'dry-run' || word === 'apply') {
      if (mode !== null && mode !== word) throw new Error(`choose dry-run or apply, not both. ${LOAD_USAGE}`)
      mode = word
    } else if (word === 'prune') {
      prune = true
    } else if (word.startsWith('unresolved-out=') && word.length > 'unresolved-out='.length) {
      unresolvedOut = word.slice('unresolved-out='.length)
    } else {
      throw new Error(`unknown argument "${word}". ${LOAD_USAGE}`)
    }
  }
  if (sites === null) throw new Error(`name the site: gallery, shop or all. ${LOAD_USAGE}`)
  if (mode === null) throw new Error(`name the mode: dry-run or apply. ${LOAD_USAGE}`)
  return { sites, dryRun: mode === 'dry-run', prune, unresolvedOut }
}
