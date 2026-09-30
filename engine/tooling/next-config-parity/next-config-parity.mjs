// TASKS.md 5.4.d — the two apps' `next.config.ts` agree on what the storefront's guarantees rest
// on (PARALLEL-TRACKS.md §1, CONVENTIONS.md §12), and each `(site)/[locale]/layout.tsx` exports
// `instant = false`. Pure functions over a loaded config and a layout's text, so a test can plant
// a violation without touching either app.
import ts from 'typescript'

/** The client-hint headers `withPayload` sends for the admin's colour theme. */
const CLIENT_HINTS = new Set(['accept-ch', 'critical-ch', 'vary'])
const ADMIN = '/admin/:path*'

/** What every storefront's config must say, whatever the app. */
export const REQUIRED = {
  cacheComponents: true,
  htmlLimitedBots: '/.*/',
  output: 'standalone',
  poweredByHeader: false,
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
