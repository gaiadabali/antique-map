// Run by `./load-config.mjs` in a child process whose `cwd` is the app (qa's 5.4 third gate, L2):
// loads `<appDir>/next.config.ts` the way `next build` does — Next's own `loadConfig` for the
// production-build phase, which loads that dir's env files through `@next/env` and transpiles the
// config with Next's SWC — then prints `resolvedConfigOf` it after MARKER, as one JSON line.
//
//   node config-child.mjs <appDir> [<dir to resolve next from>]
import { createRequire } from 'node:module'
import { join } from 'node:path'

import { resolvedConfigOf } from './resolved-config.mjs'

const MARKER = '@@resolved-config@@'

const [appDir, nextFrom = appDir] = process.argv.slice(2)
const require = createRequire(join(nextFrom, 'package.json'))
const { PHASE_PRODUCTION_BUILD } = require('next/constants')
const { default: loadConfig } = require('next/dist/server/config')
const { normalizeConfig } = require('next/dist/server/config-shared')

// `rawConfig` returns the user's module before Next merges its defaults in, so what is compared
// is the app's own config; `normalizeConfig` calls a config exported as a function, as Next does.
const loaded = await loadConfig(PHASE_PRODUCTION_BUILD, appDir, { rawConfig: true, silent: true })
const config = await normalizeConfig(PHASE_PRODUCTION_BUILD, loaded?.default ?? loaded)
process.stdout.write(`\n${MARKER}${JSON.stringify(await resolvedConfigOf(config))}\n`)
