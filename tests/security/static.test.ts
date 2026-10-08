/**
 * The static checks (TASKS.md 10.1.a, 10.1.b; SECURITY.md B1, K1–K3, D1–D3, L1, R4, S1, S3): what
 * can be proven by reading the source, run as a test so a regression fails the build. SECURITY.md
 * §3 lists these as "CI static"; until the CI job exists, `pnpm vitest run --config
 * tests/security/vitest.config.ts` runs them.
 *
 * A check that pins a known defect (an allow-list entry that is a finding, not a decision) says so
 * with its finding id (docs/gates/security.md); the day the code is fixed the pin fails, and the
 * entry is deleted.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { engineSource, localApiCalls, ROOT, walk } from './support/scan'

const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8')
const source = engineSource()
/** Source with `//` and block comments blanked, so a rule quoted in a header is not a use. */
const code = (text: string) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, '$1')

describe('no raw HTML sink outside the one reviewed (B1)', () => {
  it('uses dangerouslySetInnerHTML only for the product page’s escaped JSON-LD', () => {
    const users = source
      .filter((file) =>
        /dangerouslySetInnerHTML|\.innerHTML\s*=|insertAdjacentHTML|document\.write\(/.test(
          code(file.text),
        ),
      )
      .map((file) => file.path)
    expect(users).toEqual(['engine/apps/web/src/app/(shop)/shop/[locale]/product/[slug]/page.tsx'])
  })

  it('has no eval, no Function constructor and no string timers in app code', () => {
    const hits = source
      .filter((file) => /\beval\(|new Function\(|setTimeout\(\s*['"`]/.test(code(file.text)))
      .map((file) => file.path)
    expect(hits).toEqual([])
  })
})

describe('every Local API call that serves a request says whether access applies (R4)', () => {
  const calls = localApiCalls(source)

  it('has none without an explicit overrideAccess in the app or the HTTP package', () => {
    const silent = calls
      .filter((call) => call.overrideAccess === undefined)
      .filter(
        (call) =>
          call.path.startsWith('engine/apps/') || call.path.startsWith('engine/packages/http/'),
      )
    expect(silent).toEqual([])
  })

  it('leaves the call silent only in the importers, the seeds, and the AI kill-switch read', () => {
    // FINDING F-10 (low): `ai/draft.ts` reads the site-settings kill switch with the Local API's
    // default (access skipped) and a one-field select; it should say `overrideAccess: true`.
    const files = [
      ...new Set(
        calls
          .filter((call) => call.overrideAccess === undefined)
          .map((call) => call.path)
          .map((file) =>
            file.replace(/^(engine\/packages\/cms\/src\/(?:import|seed))\/.*$/, '$1/'),
          ),
      ),
    ].sort()
    expect(files).toEqual([
      'engine/packages/cms/src/ai/draft.ts',
      'engine/packages/cms/src/import/',
      'engine/packages/cms/src/seed/',
    ])
  })

  it('lists the files that skip access on purpose, so a new one is a decision', () => {
    // File level, so a call through a helper (`call('delete')(...)`) is counted too.
    const files = source
      .filter((file) => /overrideAccess:\s*true/.test(code(file.text)))
      .map((file) => file.path)
      .sort()
    // The request-serving ones (apps/web, packages/http) are each a server-written record or a
    // token-gated read; their headers say why (SECURITY.md §2.2, R4).
    const serving = files.filter(
      (file) => file.startsWith('engine/apps/') || file.startsWith('engine/packages/http/'),
    )
    expect(serving).toEqual([
      'engine/apps/web/src/server/analytics/collect.ts',
      'engine/apps/web/src/server/chat/adapters/payload-catalogue.ts',
      'engine/apps/web/src/server/chat/adapters/payload-store.ts',
      'engine/apps/web/src/server/leads/adapters.ts',
      'engine/apps/web/src/server/shop/tracking/tracking-query.ts',
      'engine/apps/web/src/server/site-settings.ts',
      'engine/packages/http/src/health/payload-ports.ts',
      'engine/packages/http/src/legacy/redirect-map.ts',
      'engine/packages/http/src/track/driver-image/payload-driver-image.ts',
    ])
  })
})

describe('no public build-time variable (K2)', () => {
  it('reads no NEXT_PUBLIC_* variable anywhere in the engine or the workflows', () => {
    const files = [
      ...source,
      ...walk('.github', () => true),
      { path: 'engine/apps/web/next.config.ts', text: read('engine/apps/web/next.config.ts') },
    ]
    const uses = files
      .filter((file) => /NEXT_PUBLIC_[A-Z0-9_]+/.test(code(file.text)))
      .map((file) => file.path)
    expect(uses).toEqual([])
  })
})

describe('outbound requests go to listed hosts, with a timeout (S1, S3)', () => {
  const callers = source
    .filter((file) => /\bfetch\(|(?:\?\?|[:=])\s*fetch\b|globalThis\.fetch/.test(code(file.text)))
    .filter((file) => !file.path.startsWith('engine/packages/migrate/')) // the offline importer, run by a person
    .filter((file) => !/\/(shared\/(beacon|chat)|sites\/)|-client\.jsx$/.test(file.path)) // browser code: same-origin paths
  const server = callers.map((file) => file.path).sort()

  it('server-side fetches are exactly the geocoder, Turnstile, Midtrans, the admin image reader and the cache poster', () => {
    expect(server).toEqual(
      [
        'engine/apps/web/src/server/chat/adapters/turnstile.ts',
        'engine/apps/web/src/server/shop/checkout/geocode.ts',
        'engine/apps/web/src/app/(payload)/admin/ai/images.ts',
        'engine/packages/cache/src/post.ts',
        'engine/packages/cms/src/shop/payments/snap.ts',
        'engine/packages/http/src/track/driver-image/route.ts',
      ].sort(),
    )
  })

  it('every host named in those files is on the allow-list', () => {
    const allowed = new Set([
      'maps.googleapis.com',
      'challenges.cloudflare.com',
      'app.midtrans.com',
      'api.midtrans.com',
      'app.sandbox.midtrans.com',
      'api.sandbox.midtrans.com',
    ])
    const hosts = new Set<string>()
    for (const file of [
      ...callers,
      ...source.filter((f) => f.path.endsWith('shop/payments/config.ts')),
    ]) {
      for (const match of code(file.text).matchAll(/https:\/\/([a-z0-9.-]+)/g)) hosts.add(match[1]!)
    }
    expect([...hosts].filter((host) => !allowed.has(host))).toEqual([])
  })

  it('has a timeout on all but the geocoder, which is finding F-07', () => {
    const without = callers
      .filter((file) => !/AbortSignal\.(timeout|any)/.test(code(file.text)))
      .map((file) => file.path)
    // FINDING F-07 (medium-low): the geocode proxy's `fetch(url)` has no timeout, no size cap and
    // follows redirects (S3). Fix: AbortSignal.timeout(5_000) and redirect: 'error'.
    expect(without).toEqual(['engine/apps/web/src/server/shop/checkout/geocode.ts'])
  })
})

describe('logs carry no request body or personal data (L1, L2)', () => {
  const logCalls = source
    .filter((file) =>
      /\/(api\/x|server\/(chat|leads|orders|shop)|shop\/(orders|payments|fulfilment|notify)|http\/src)/.test(
        file.path,
      ),
    )
    .flatMap((file) =>
      [
        ...code(file.text).matchAll(/console\.(?:log|info|warn|error|debug)\(([^;]*?)\)\s*$/gms),
      ].map((match) => ({ path: file.path, text: match[1]! })),
    )

  it('finds the logging calls it is meant to read', () => {
    expect(logCalls.length).toBeGreaterThan(15)
  })

  it('never interpolates a body, contact or address field into a log line', () => {
    const personal =
      /\$\{[^}]*\b(body|payload|raw|email|whatsapp|phone|address|contact|message|lat|lng|token)\b[^}]*\}/i
    const hits = logCalls.filter((call) => personal.test(call.text)).map((call) => call.path)
    expect(hits).toEqual([])
  })

  it('logs a buyer’s address in one place: the notifier’s "no shop origin" line (finding F-08)', () => {
    // FINDING F-08 (low): `[notify] order N: no shop origin configured; ${to} email not sent` writes
    // the buyer's email address to the log (L2). Fix: drop `${to}`; the order id is enough.
    const notify = source.find((file) => file.path.endsWith('shop/notify/index.ts'))!
    expect(code(notify.text)).toContain('${to} email not sent')
  })
})

describe('dependencies and supply chain are pinned and gated (D1–D3, K3)', () => {
  const manifests = walk(
    '.',
    (file) => file.endsWith('package.json') && !file.includes('node_modules'),
  )
    .filter((file) => !file.path.startsWith('.claude/') && !file.path.startsWith('docs/'))
    .map((file) => ({
      path: file.path,
      json: JSON.parse(file.text) as Record<string, Record<string, string>>,
    }))

  it('has a committed lockfile, and CI installs with --frozen-lockfile', () => {
    expect(existsSync(path.join(ROOT, 'pnpm-lock.yaml'))).toBe(true)
    expect(read('.github/actions/setup-pnpm-node/action.yml')).toContain('--frozen-lockfile')
  })

  it('pins every dependency of every package to an exact version (workspace links aside)', () => {
    const loose: string[] = []
    for (const { path: file, json } of manifests) {
      for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
        for (const [name, range] of Object.entries(json[field] ?? {})) {
          if (range.startsWith('workspace:')) continue
          if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(range))
            loose.push(`${file}: ${name}@${range}`)
        }
      }
    }
    expect(loose).toEqual([])
  })

  it('has one version of next and one of payload and its plugins', () => {
    const versions = new Map<string, Set<string>>()
    for (const { json } of manifests) {
      for (const [name, range] of Object.entries({
        ...json.dependencies,
        ...json.devDependencies,
      })) {
        const family =
          name === 'next'
            ? 'next'
            : name === 'payload' || name.startsWith('@payloadcms/')
              ? 'payload'
              : null
        if (family === null) continue
        versions.set(family, (versions.get(family) ?? new Set()).add(range))
      }
    }
    expect([...versions.get('next')!]).toHaveLength(1)
    expect([...versions.get('payload')!]).toHaveLength(1)
  })

  it('allows install scripts only for listed packages (pnpm 11 allowBuilds)', () => {
    const workspace = read('pnpm-workspace.yaml')
    expect(workspace).toMatch(/allowBuilds:/)
    const block = workspace.split('allowBuilds:')[1]!.split(/\n\S/)[0]!
    const allowed = [...block.matchAll(/^\s+['"]?([@\w/.-]+)['"]?:\s*true/gm)].map((m) => m[1])
    expect(allowed.sort()).toEqual(['@tailwindcss/oxide', 'esbuild', 'sharp', 'unrs-resolver'])
  })

  it('has the secret scan and the audit in the workflows (K3, D2)', () => {
    expect(read('.github/workflows/secrets.yml')).toMatch(/gitleaks/)
    expect(read('.github/workflows/ci.yml')).toMatch(/pnpm audit --prod --audit-level=high/)
  })
})

describe('no secret is tracked (K1, K2)', () => {
  it('ignores every .env file but the example, which holds placeholders only', () => {
    const ignore = read('.gitignore')
    expect(ignore).toMatch(/^\.env$/m)
    expect(ignore).toMatch(/^\.env\.\*$/m)
    expect(ignore).toMatch(/^!\.env\.example$/m)
    const example = read('.env.example')
    for (const line of example.split('\n')) {
      const match = /^([A-Z0-9_]*(?:SECRET|KEY|PASSWORD|TOKEN)[A-Z0-9_]*)=(.*)$/.exec(line.trim())
      if (match === null) continue
      expect(match[2], `${match[1]} in .env.example holds a real-looking value`).toMatch(
        /^$|^(change-me|dev-only|your-|example|minioadmin|postgres|replace)|^<|^\$\{/i,
      )
    }
  })

  it('has no private key, cloud key or provider token in the tree (a ripgrep-style pass)', () => {
    const patterns: Array<[string, RegExp]> = [
      ['private key block', /-----BEGIN (?:RSA |EC |OPENSSH |PGP |DSA )?PRIVATE KEY-----/],
      ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
      ['Anthropic key', /\bsk-ant-(?!test)[A-Za-z0-9_-]{20,}/],
      ['OpenAI/OpenRouter key', /\bsk-(?:or-)?[A-Za-z0-9]{32,}\b/],
      ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
      ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
      ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
      ['Midtrans live server key', /\bMid-server-(?!TEST|indies)[A-Za-z0-9_-]{20,}/],
    ]
    const known = [/AKIAIOSFODNN7EXAMPLE/]
    const files = [
      ...walk('engine', (f) => /\.(ts|tsx|js|jsx|mjs|json|yml|yaml|md|sh)$/.test(f)),
      ...walk('scripts', () => true),
      ...walk('.github', () => true),
      ...walk(
        'tests',
        (f) =>
          /\.(ts|mjs|json)$/.test(f) && !f.includes('support') && !f.endsWith('static.test.ts'),
      ),
      { path: '.env.example', text: read('.env.example') },
    ]
    const hits: string[] = []
    for (const file of files) {
      for (const [name, pattern] of patterns) {
        const match = pattern.exec(file.text)
        if (match !== null && !known.some((k) => k.test(match[0])))
          hits.push(`${file.path}: ${name}`)
      }
    }
    expect(hits).toEqual([])
  })
})
