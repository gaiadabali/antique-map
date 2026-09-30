// What a Client Component may never reach (TASKS.md 4.2.a; CONVENTIONS.md §5–§6;
// DESIGN-SYSTEM.md §7). Each rule names why, so a failure explains itself.
import { builtinModules } from 'node:module'

const CONFIG_SERVER_ENTRIES = ['schema', 'routes', 'loader', 'validate', 'boot-check']

/**
 * The built-ins a bare name reaches (`crypto`, `path`, `fs/promises`, `_http_agent`, …). The
 * `node:`-only ones (`node:test`, `node:sea`) are left out: bare, those names are npm packages.
 */
const BARE_BUILTINS = builtinModules.filter((name) => !name.startsWith('node:'))

/** A package name and everything under it: `zod` and `zod/v4`, never `zodiac`. */
const within = (specifier, name) => specifier === name || specifier.startsWith(`${name}/`)

export const RULES = [
  {
    test: (s) => within(s, 'zod'),
    reason:
      'the schema library (~28 KB gzip of the 150 KB first-party budget, DESIGN-SYSTEM.md §7)',
  },
  ...CONFIG_SERVER_ENTRIES.map((entry) => ({
    test: (s) => within(s, `@engine/config/${entry}`),
    reason: `a server entry of C1/C10 — a Client Component takes links and values as props; only @engine/config/constants is client-safe (CONVENTIONS.md §6)`,
  })),
  {
    test: (s) => s.startsWith('node:'),
    reason: 'a Node built-in: nothing a browser bundle can load',
  },
  {
    test: (s) => BARE_BUILTINS.some((name) => within(s, name)),
    reason:
      'a Node built-in, bare: nothing a browser bundle can load (Next ships a polyfill instead)',
  },
  {
    test: (s) => within(s, 'payload') || s.startsWith('@payloadcms/') || within(s, '@engine/cms'),
    reason: 'Payload: app components render view models, never the CMS (CONVENTIONS.md §5)',
  },
]

/** The reason a specifier is forbidden in a client bundle, or `null` when it is not. */
export function forbiddenReason(specifier) {
  if (specifier.startsWith('.')) return null
  return RULES.find(({ test }) => test(specifier))?.reason ?? null
}
