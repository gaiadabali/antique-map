// TASKS.md 5.4.b — ARCHITECTURE.md §15's package fences, each proven by a planted violation that
// the repository's own ESLint config (eslint.config.mjs) refuses by file and passes once it is
// gone. Nothing is written to disk: `lintText` lints the text as if it lived at that path.
import { join } from 'node:path'

import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'

const repoRoot = process.cwd()
let eslint
beforeAll(() => {
  eslint = new ESLint({ cwd: repoRoot })
}, 60_000)

/** The engine fences `code` breaks, at `path` (from the repository root). */
async function fencesAt(path, code) {
  const [result] = await eslint.lintText(code, { filePath: join(repoRoot, path) })
  return result.messages.map((m) => m.ruleId).filter((id) => id?.startsWith('fences/'))
}

const HTTP = 'engine/packages/http/src'
/** One ESLint per file, whose first lint loads the config: generous on a loaded machine. */
const LOADED = { timeout: 60_000 }

describe('only a payload-*.ts module reaches Payload by value (5.4.b)', LOADED, () => {
  it.each([
    [`${HTTP}/health/route.ts`, "import { cms } from '@engine/cms/instance'\n"],
    [`${HTTP}/health/route.ts`, "import { type Payload } from 'payload'\n"], // still loads it
    [`${HTTP}/legacy/route.ts`, "export { getPayload } from 'payload'\n"],
    [`${HTTP}/cron/sweeps/route.ts`, "export * from '@payloadcms/db-postgres'\n"],
    [`${HTTP}/proxy/decide.ts`, "export const load = () => import('@engine/cms')\n"],
    [`${HTTP}/health/health.test.ts`, "import { cms } from '@engine/cms/instance'\n"],
  ])('refuses %s: %s', async (path, code) => {
    expect(await fencesAt(path, code)).toEqual(['fences/payload-by-value'])
  })

  it.each([
    [`${HTTP}/health/route.ts`, "import type { Payload } from 'payload'\n"],
    [`${HTTP}/health/route.ts`, "export type { Payload } from 'payload'\n"],
    [`${HTTP}/health/payload-ports.ts`, "import { cms } from '@engine/cms/instance'\n"],
    [`${HTTP}/cron/jobs/payload-queue.ts`, "export const run = () => import('payload')\n"],
    [`${HTTP}/health/route.ts`, "import { atRequestTime } from '../shared/respond'\n"],
  ])('passes %s: %s', async (path, code) => {
    expect(await fencesAt(path, code)).toEqual([])
  })
})

describe('a payload-*.ts module is loaded by import() alone, but in a test (5.4.b)', LOADED, () => {
  it.each([
    "import { healthPorts } from './payload-ports'\n",
    "export * from './payload-ports'\n",
    "export { summariseRun } from '../jobs/payload-queue'\n",
  ])('refuses in a route: %s', async (code) => {
    expect(await fencesAt(`${HTTP}/health/route.ts`, code)).toEqual([
      'fences/payload-module-static',
    ])
  })

  it.each([
    [`${HTTP}/health/route.ts`, "export const load = () => import('./payload-ports')\n"],
    [`${HTTP}/health/route.ts`, "import type { PayloadHealthPorts } from './payload-ports'\n"],
    [`${HTTP}/health/payload-ports.test.ts`, "import { healthPorts } from './payload-ports'\n"],
  ])('passes %s: %s', async (path, code) => {
    expect(await fencesAt(path, code)).toEqual([])
  })
})

describe('no cycle between cms, http and the loaders (5.4.b)', LOADED, () => {
  it.each([
    [
      'engine/packages/cms/src/hooks/x.ts',
      "import { FORM_RESULT } from '@engine/http/manifest'\n",
      'cms-no-http',
    ],
    [
      'engine/packages/cms/src/x.ts',
      "export const h = () => import('@engine/http/health')\n",
      'cms-no-http',
    ],
    [`${HTTP}/sitemap/route.ts`, "import { loadItem } from '@engine/loaders'\n", 'http-no-loaders'],
    [`${HTTP}/og/route.ts`, "import type { X } from '@engine/loaders/item'\n", 'http-no-loaders'],
    [
      'engine/packages/loaders/src/item.ts',
      "import { GET } from '@engine/http/health'\n",
      'loaders-http-manifest-only',
    ],
    [
      'engine/packages/loaders/src/item.ts',
      "import { ENGINE_ROUTES } from '@engine/http'\n",
      'loaders-http-manifest-only',
    ],
  ])('refuses %s: %s', async (path, code, rule) => {
    expect(await fencesAt(path, code)).toEqual([`fences/${rule}`])
  })

  it('lets the loaders read the manifest', async () => {
    const code = "import { FORM_RESULT } from '@engine/http/manifest'\n"
    expect(await fencesAt('engine/packages/loaders/src/forms.ts', code)).toEqual([])
  })
})

describe(
  'the manifest imports other packages as types only, its tests excepted (5.4.b)',
  LOADED,
  () => {
    it.each([`${HTTP}/manifest.ts`, `${HTTP}/manifest/forms.ts`])('refuses in %s', async (path) => {
      const code = "import { brandConfigSchema } from '@engine/config/schema'\n"
      expect(await fencesAt(path, code)).toEqual(['fences/manifest-types-only'])
    })

    it.each([
      [`${HTTP}/manifest.ts`, "import type { ModuleKey } from '@engine/config/schema'\n"],
      [`${HTTP}/manifest/forms.ts`, "import { GET } from './types'\n"],
      [
        `${HTTP}/manifest/root-rewrites.test.ts`,
        "import { loadBrand } from '@engine/config/loader'\n",
      ],
    ])('passes %s: %s', async (path, code) => {
      expect(await fencesAt(path, code)).toEqual([])
    })
  },
)

describe("@engine/cache imports nothing of the engine's but C1's types (5.4.b)", LOADED, () => {
  const TAGS = 'engine/packages/cache/src/tags.ts'
  it.each([
    "import { formatMoney } from '@engine/domain'\n",
    "import { brandConfigSchema } from '@engine/config/schema'\n", // C1, but by value
    "import type { X } from '@engine/http/manifest'\n",
    "import { schema } from '../../config/src/schema'\n", // out of the package by a relative path
  ])('refuses %s', async (code) => {
    expect(await fencesAt(TAGS, code)).toEqual(['fences/cache-leaf'])
  })

  it.each([
    [TAGS, "import type { ModuleKey } from '@engine/config/schema'\n"],
    [TAGS, "import { revalidateTag } from 'next/cache'\n"],
    [TAGS, "import { tagOf } from './read'\n"],
    [
      'engine/packages/cache/test/leaf.test.ts',
      "import { brandConfigSchema } from '@engine/config/schema'\n",
    ],
  ])('passes %s: %s', async (path, code) => {
    expect(await fencesAt(path, code)).toEqual([])
  })
})

describe(
  'a path spelled out, require() and import = require() are fenced too (qa S2)',
  LOADED,
  () => {
    it.each([
      // a relative path out of the package reaches what the package name would
      [
        'engine/packages/cms/src/x.ts',
        "import { POST } from '../../http/src/revalidate/route'\n",
        'cms-no-http',
      ],
      [
        `${HTTP}/sitemap/route.ts`,
        "import { loadItem } from '../../../loaders/src/index'\n",
        'http-no-loaders',
      ],
      [
        'engine/packages/loaders/src/item.ts',
        "import { GET } from '../../http/src/health/route'\n",
        'loaders-http-manifest-only',
      ],
      [
        `${HTTP}/manifest/x.ts`,
        "export * from '../../../config/src/schema'\n",
        'manifest-types-only',
      ],
      [
        `${HTTP}/legacy/route.ts`,
        "import { cms } from '../../../cms/src/instance'\n",
        'payload-by-value',
      ],
      [
        `${HTTP}/legacy/route.ts`,
        "import '../../../../../node_modules/payload/dist/index.js'\n",
        'payload-by-value',
      ],
      [
        'engine/packages/cache/src/tags.ts',
        "import { x } from '../../../tooling/db/cli.mjs'\n",
        'cache-leaf',
      ],
      // require(), createRequire(…)() and TypeScript's import = require()
      [`${HTTP}/legacy/route.ts`, "const payload = require('payload')\n", 'payload-by-value'],
      [
        `${HTTP}/legacy/route.ts`,
        "const p = createRequire(import.meta.url)('@engine/cms')\n",
        'payload-by-value',
      ],
      [`${HTTP}/legacy/route.ts`, "import payload = require('payload')\n", 'payload-by-value'],
      [
        'engine/packages/cms/src/x.ts',
        "import http = require('@engine/http/health')\n",
        'cms-no-http',
      ],
      [
        `${HTTP}/health/route.ts`,
        "const ports = require('./payload-ports')\n",
        'payload-module-static',
      ],
      [`${HTTP}/og/route.ts`, "const l = require('@engine/loaders')\n", 'http-no-loaders'],
      [
        'engine/packages/loaders/src/item.ts',
        "import h = require('@engine/http')\n",
        'loaders-http-manifest-only',
      ],
      [
        `${HTTP}/manifest.ts`,
        "import s = require('@engine/config/schema')\n",
        'manifest-types-only',
      ],
      ['engine/packages/cache/src/tags.ts', "const d = require('@engine/domain')\n", 'cache-leaf'],
    ])('refuses %s: %s', async (path, code, rule) => {
      expect(await fencesAt(path, code)).toEqual([`fences/${rule}`])
    })

    it.each([
      [
        'engine/packages/loaders/src/forms.ts',
        "import { FORM_RESULT } from '../../http/src/manifest'\n",
      ],
      [`${HTTP}/manifest/forms.ts`, "import { GET } from '../manifest/types'\n"], // its own package
      [`${HTTP}/legacy/route.ts`, "import type Payload = require('payload')\n"],
    ])('passes %s: %s', async (path, code) => {
      expect(await fencesAt(path, code)).toEqual([])
    })
  },
)
