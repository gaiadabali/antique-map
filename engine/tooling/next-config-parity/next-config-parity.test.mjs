// TASKS.md 5.4.d — both apps' next.config.ts agree on the storefront's guarantees, and both
// locale layouts export `instant = false` (PARALLEL-TRACKS.md §1, CONVENTIONS.md §12). The real
// files first; then each rule proven by a planted violation that names its file.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  exportsInstantFalse,
  guaranteesOf,
  judgeGuarantees,
  REQUIRED,
} from './next-config-parity.mjs'

const repoRoot = process.cwd()
const APPS = ['gallery', 'emporium']
const configFile = (app) => `engine/apps/${app}/next.config.ts`
const layoutFile = (app) => `engine/apps/${app}/src/app/(site)/[locale]/layout.tsx`
const FILES = Object.fromEntries(APPS.map((app) => [app, configFile(app)]))
/** Loading a config loads withPayload: generous on a loaded machine. */
const LOADED = { timeout: 60_000 }

async function loadGuarantees(app) {
  const url = pathToFileURL(join(repoRoot, configFile(app))).href
  return guaranteesOf((await import(url)).default)
}

describe("the apps' next.config.ts (5.4.d)", LOADED, () => {
  it('agree on cacheComponents, htmlLimitedBots, output, poweredByHeader and the client hints', async () => {
    const byApp = Object.fromEntries(
      await Promise.all(APPS.map(async (app) => [app, await loadGuarantees(app)])),
    )
    expect(judgeGuarantees(byApp, FILES)).toEqual([])
    expect(byApp.gallery).toMatchObject(REQUIRED)
    expect(byApp.gallery.clientHints).toEqual([
      { source: '/admin/:path*', hints: expect.arrayContaining(['accept-ch', 'critical-ch']) },
    ])
  })
})

describe('each (site)/[locale]/layout.tsx exports instant = false (5.4.d)', () => {
  it.each(APPS)('%s', (app) => {
    const file = layoutFile(app)
    expect(exportsInstantFalse(readFileSync(join(repoRoot, file), 'utf8')), file).toBe(true)
  })

  it.each([
    'export const instant = true\n',
    'export let instant = false\n',
    'const instant = false\nexport { instant }\n', // not the literal export Next reads statically
    '// export const instant = false\n',
    '',
  ])('refuses %j', (source) => {
    expect(exportsInstantFalse(source)).toBe(false)
  })
})

describe('the planted violations (5.4.d)', () => {
  const good = () => ({
    ...REQUIRED,
    clientHints: [{ source: '/admin/:path*', hints: ['accept-ch', 'critical-ch', 'vary'] }],
  })
  const judge = (emporium) => judgeGuarantees({ gallery: good(), emporium }, FILES)

  it('passes two configs that say the same, as required', () => {
    expect(judge(good())).toEqual([])
  })

  it.each([
    ['cacheComponents', false],
    ['htmlLimitedBots', '/Googlebot/'],
    ['output', undefined],
    ['poweredByHeader', true],
  ])('flags %s changed in one app, naming its file', (key, value) => {
    const problems = judge({ ...good(), [key]: value })
    expect(problems).toContainEqual(
      expect.stringMatching(/^engine\/apps\/emporium\/next\.config\.ts: /),
    )
    expect(problems).toContain(
      "engine/apps/emporium/next.config.ts and engine/apps/gallery/next.config.ts differ on the storefront's guarantees",
    )
  })

  it("reads withPayload's own X-Powered-By rule as poweredByHeader: true", async () => {
    const headers = async () => [
      { source: '/:path*', headers: [{ key: 'X-Powered-By', value: 'Next.js, Payload' }] },
    ]
    const facts = await guaranteesOf({ ...REQUIRED, htmlLimitedBots: /.*/, headers })
    expect(facts.poweredByHeader).toBe(true)
  })

  it("flags withPayload's client hints on every path, or on none", () => {
    const everywhere = { ...good(), clientHints: [{ source: '/:path*', hints: ['critical-ch'] }] }
    expect(judge(everywhere)).toEqual(
      expect.arrayContaining([
        "engine/apps/emporium/next.config.ts: withPayload's client hints on /:path*, not /admin/:path* alone",
        "engine/apps/emporium/next.config.ts: no client hints on /admin/:path* (the admin's theme needs them)",
      ]),
    )
  })
})
