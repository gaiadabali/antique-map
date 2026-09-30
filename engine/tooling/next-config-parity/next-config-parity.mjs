// TASKS.md 5.4.d — the apps' `next.config.ts` are one file in all but an explicit allowlist, and
// state what the storefront's guarantees rest on (PARALLEL-TRACKS.md §1, CONVENTIONS.md §12); each
// `(site)/[locale]/layout.tsx` exports `instant = false`. Pure functions over the files' text and
// a loaded config, so a test can plant a violation without touching either app.
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import ts from 'typescript'

/** Every `engine/apps/*` with a `next.config.ts`, found on disk as route parity finds its apps. */
export function discoverApps(repoRoot) {
  const appsDir = join(repoRoot, 'engine', 'apps')
  if (!existsSync(appsDir)) return []
  return readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(appsDir, name, 'next.config.ts')))
    .sort()
}

/**
 * Lines the apps' configs may hold differently, each with the reason (qa's 5.4 gate, S4): a
 * difference between storefronts is a decision, written here. Empty today — the files are
 * byte-identical — so any drift, a `trailingSlash` or a `cacheLife` in one app, fails.
 */
export const ALLOWED_DIFFERENCES = [
  // { line: /^\s*someOption: /, why: 'the emporium …, decided in TASKS.md x.y' },
]

/**
 * Where each app's config text (`texts`: `{ app: text }`, keyed like `files`) differs from the
 * first app's, lines matching `allowed` aside: one problem per app, naming both files and the
 * first differing line.
 */
export function textDifferences(texts, files, allowed = ALLOWED_DIFFERENCES) {
  const keep = (text) =>
    text
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line, index) => ({ line, number: index + 1 }))
      .filter(({ line }) => !allowed.some(({ line: pattern }) => pattern.test(line)))
  const [[firstApp, firstText], ...others] = Object.entries(texts)
  const base = keep(firstText)
  const problems = []
  for (const [app, text] of others) {
    const lines = keep(text)
    const at = Array.from({ length: Math.max(base.length, lines.length) }).findIndex(
      (_, i) => base[i]?.line !== lines[i]?.line,
    )
    if (at === -1) continue
    const shown = (line) => (line ? `line ${line.number}: ${line.line.trim()}` : 'its end')
    problems.push(
      `${files[app]} differs from ${files[firstApp]} at ${shown(lines[at])} (${files[firstApp]} ${shown(base[at])})`,
    )
  }
  return problems
}

/** The client-hint headers `withPayload` sends for the admin's colour theme. */
const CLIENT_HINTS = new Set(['accept-ch', 'critical-ch', 'vary'])
const ADMIN = '/admin/:path*'

/** What every storefront's config must say, whatever the app. */
export const REQUIRED = {
  cacheComponents: true,
  htmlLimitedBots: '/.*/',
  output: 'standalone',
  poweredByHeader: false,
  trailingSlash: false, // unset or false: a storefront URL never ends in a slash (C10)
}

/** The guarantees one loaded config (its default export) states, comparable with `toEqual`. */
export async function guaranteesOf(config) {
  const rules = (await config.headers?.()) ?? []
  const hinted = rules
    .map(({ source, headers }) => ({
      source,
      hints: headers.map(({ key }) => key.toLowerCase()).filter((key) => CLIENT_HINTS.has(key)),
    }))
    .filter(({ hints }) => hints.length > 0)
  return {
    cacheComponents: config.cacheComponents,
    htmlLimitedBots: String(config.htmlLimitedBots),
    output: config.output,
    trailingSlash: config.trailingSlash ?? false,
    // withPayload turns `poweredByHeader: true` into its own `X-Powered-By` header rule, leaving
    // the flag false: either one means the header is sent.
    poweredByHeader:
      config.poweredByHeader !== false ||
      rules.some(({ headers }) => headers.some(({ key }) => key.toLowerCase() === 'x-powered-by')),
    clientHints: hinted,
  }
}

/**
 * Every way `byApp` (`{ app: guarantees }`) breaks the rules, each naming its app's config file
 * (`files[app]`): a value that is not `REQUIRED`'s, client hints on any source but `/admin/:path*`
 * or on none, and two apps that differ.
 */
export function judgeGuarantees(byApp, files) {
  const problems = []
  for (const [app, facts] of Object.entries(byApp)) {
    for (const [key, value] of Object.entries(REQUIRED)) {
      if (facts[key] !== value)
        problems.push(`${files[app]}: ${key} is ${JSON.stringify(facts[key])}, not ${value}`)
    }
    const sources = facts.clientHints.map(({ source }) => source)
    for (const source of sources.filter((source) => source !== ADMIN))
      problems.push(`${files[app]}: withPayload's client hints on ${source}, not ${ADMIN} alone`)
    if (!sources.includes(ADMIN))
      problems.push(`${files[app]}: no client hints on ${ADMIN} (the admin's theme needs them)`)
  }
  const [first, ...others] = Object.entries(byApp)
  for (const [app, facts] of others) {
    if (JSON.stringify(facts) !== JSON.stringify(first[1]))
      problems.push(`${files[app]} and ${files[first[0]]} differ on the storefront's guarantees`)
  }
  return problems
}

/** Whether a layout's source exports `const instant = false`, as that literal. */
export function exportsInstantFalse(source, fileName = 'layout.tsx') {
  const file = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  return file.statements.some(
    (statement) =>
      ts.isVariableStatement(statement) &&
      statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
      statement.declarationList.flags & ts.NodeFlags.Const &&
      statement.declarationList.declarations.some(
        (d) =>
          ts.isIdentifier(d.name) &&
          d.name.text === 'instant' &&
          d.initializer?.kind === ts.SyntaxKind.FalseKeyword,
      ),
  )
}
