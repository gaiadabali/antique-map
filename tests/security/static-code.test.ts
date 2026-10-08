/**
 * The static checks on the code (TASKS.md 10.1.a; SECURITY.md B1, K2, L1, L2, R4, S1, S3): what can
 * be proven by reading the source, run as a test so a regression fails the build. SECURITY.md §3
 * lists these as "CI static"; until the CI job exists, `pnpm vitest run --config
 * tests/security/vitest.config.ts` runs them.
 *
 * A check that pins a known defect (an allow-list entry that is a finding, not a decision) says so
 * with its finding id (docs/gates/security.md); the day the code is fixed the pin fails, and the
 * entry is deleted.
 */
import { readFileSync } from 'node:fs'
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

  it('leaves the call silent only in the importers and the seeds (F-10: the AI kill-switch read now says so)', () => {
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
    expect(files).toEqual(['engine/packages/cms/src/import/', 'engine/packages/cms/src/seed/'])
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

  it('has a timeout on every server-side fetch, the geocoder included (F-07, fixed)', () => {
    const without = callers
      .filter((file) => !/AbortSignal\.(timeout|any)/.test(code(file.text)))
      .map((file) => file.path)
    expect(without).toEqual([])
  })

  it('the geocoder and Turnstile follow no redirect and have a 5 second budget (S3, F-07)', () => {
    for (const path of [
      'engine/apps/web/src/server/shop/checkout/geocode.ts',
      'engine/apps/web/src/server/chat/adapters/turnstile.ts',
    ]) {
      const text = code(source.find((file) => file.path === path)!.text)
      expect(text, path).toContain("redirect: 'error'")
      // The geocoder names its budget once, as a constant the unit tests also read.
      const geocoder = path.endsWith('geocode.ts')
      expect(text, path).toContain(
        geocoder ? 'AbortSignal.timeout(GEOCODE_TIMEOUT_MS)' : 'AbortSignal.timeout(5_000)',
      )
      if (geocoder) expect(text).toContain('GEOCODE_TIMEOUT_MS = 5_000')
    }
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

  it('the notifier’s "no shop origin" line logs the order id and the notification kind only (F-08)', () => {
    // `to` is the order status the notice is for, never the buyer's address.
    const notify = source.find((file) => file.path.endsWith('shop/notify/index.ts'))!
    expect(code(notify.text)).toContain('${to} notification not sent')
    expect(code(notify.text)).not.toContain('email not sent')
  })
})
