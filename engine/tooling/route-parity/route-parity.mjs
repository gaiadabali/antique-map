// 2.2.d — reads the `@engine/http` manifest (C13) and checks every invariant
// TASKS.md 2.2.d names, and 5.4.a's: which module each mount names
// (`./specifiers.mjs`), and every mount loaded under the Payload hook
// (`./payload-hook.mjs`), resolved with Next's route-handler conditions, and
// no engine package branching on a condition (`./package-exports.mjs`). Degrades explicitly (a `degraded` entry, not a
// violation) wherever its input does not exist yet, per this ticket's brief.
import { join } from 'node:path'

import { checkAppMounts, discoverScaffoldedApps, readProxyMatcher } from './app-mounts.mjs'
import { discoverCollectionSlugs } from './collections.mjs'
import {
  findExportConditions,
  loadConditionalBranches,
  NEXT_ROUTE_CONDITIONS,
  readEnginePackages,
} from './package-exports.mjs'
import { withPayloadGuard } from './payload-guard.mjs'
import { payloadHook } from './payload-hook.mjs'
import { findDuplicateMounts, findReservedSegmentCollisions, matchersEqual } from './rules.mjs'
import { findSpecifierMismatches } from './specifiers.mjs'
import { withTsRunner } from './ts-runner.mjs'

const HTTP_SRC = ['engine', 'packages', 'http', 'src']
const MANIFEST_PATH = [...HTTP_SRC, 'manifest.ts']

/**
 * `opts.manifestAbsPath`, `opts.appsAbsDir`, `opts.collectionsRoot` (the
 * root whose `engine/packages/cms` is read for slugs), `opts.httpSrcAbsDir`
 * (where a handler's `src/<area>/route.ts` is looked for) and `opts.alias`
 * (Vite aliases for a fixture's `@engine/http/*`) and `opts.packagesAbsDir`
 * (the packages whose `exports` are judged) let a test point at
 * fixtures outside `repoRoot` (the real manifest, `engine/apps/*`, http and
 * CMS are what CI checks; production code never overrides them). Every load
 * runs under the Payload hook (5.4.a), the manifest's and the proxy's too.
 */
export async function checkRouteParity(repoRoot, opts = {}) {
  const violations = []
  const degraded = []
  const manifestAbsPath = opts.manifestAbsPath ?? join(repoRoot, ...MANIFEST_PATH)
  const appsAbsDir = opts.appsAbsDir ?? join(repoRoot, 'engine', 'apps')
  const collectionsRoot = opts.collectionsRoot ?? repoRoot
  const httpSrcDir = opts.httpSrcAbsDir ?? join(repoRoot, ...HTTP_SRC)
  const packagesDir = opts.packagesAbsDir ?? join(repoRoot, 'engine', 'packages')
  const runner = {
    plugins: [payloadHook(repoRoot)],
    alias: opts.alias,
    conditions: NEXT_ROUTE_CONDITIONS,
  }

  return withPayloadGuard(() =>
    withTsRunner(
      repoRoot,
      async (loadModule) => {
        const manifest = await loadModule(manifestAbsPath)
        const routes = manifest.ENGINE_ROUTES
        const proxyMatcher = manifest.PROXY_MATCHER
        const { handlerOf, unbuiltHandlerOf } = manifest

        // Manifest-only invariants — always checkable, no app or CMS required.
        for (const path of findDuplicateMounts(routes)) {
          violations.push({ kind: 'duplicate-mount', path })
        }
        const { slugs: collectionSlugs, available } = discoverCollectionSlugs(collectionsRoot)
        if (!available) {
          degraded.push(
            'collection-slug collisions: nothing to check yet — neither engine/packages/cms/src/collections nor registries/collections.ts exists (Payload boot is 3.2+); reserved-word collisions (payload-jobs, graphql) are still checked',
          )
        }
        for (const collision of findReservedSegmentCollisions(routes, collectionSlugs)) {
          violations.push({ kind: 'reserved-segment-collision', ...collision })
        }

        // Per-app invariants — need a scaffolded `src/app` (phase 4).
        const apps = discoverScaffoldedApps(repoRoot, appsAbsDir)
        if (apps.length === 0) {
          degraded.push(
            'app mounts and proxy matcher: nothing to check yet — no app under engine/apps/* has a src/app tree (phase 4, App shells, has not landed)',
          )
        }
        const specifiersByPath = new Map()
        for (const app of apps) {
          const appDir = join(appsAbsDir, app)
          const names = { app, handlerOf, unbuiltHandlerOf, httpSrcDir }
          const mounts = await checkAppMounts(appDir, routes, loadModule, names)
          const { missingFiles, methodMismatches, specifiers } = mounts
          violations.push(...mounts.violations)
          for (const [path, named] of specifiers) {
            specifiersByPath.set(path, { ...specifiersByPath.get(path), [app]: named })
          }
          for (const { path, file } of missingFiles) {
            violations.push({ kind: 'missing-route-file', app, path, file })
          }
          for (const mismatch of methodMismatches) {
            violations.push({ kind: 'method-mismatch', app, ...mismatch })
          }
          const appMatcher = await readProxyMatcher(appDir, loadModule)
          if (appMatcher === null) {
            degraded.push(`proxy matcher for ${app}: nothing to check yet — no src/proxy.ts`)
          } else if (!matchersEqual(appMatcher, proxyMatcher)) {
            violations.push({
              kind: 'proxy-matcher-mismatch',
              app,
              expected: proxyMatcher,
              actual: appMatcher,
            })
          }
        }

        violations.push(...findSpecifierMismatches(specifiersByPath))

        // No engine package hands Next a different module than this run loads (5.4 re-gate).
        const packages = readEnginePackages(packagesDir)
        violations.push(...findExportConditions(packages, repoRoot))
        violations.push(...(await loadConditionalBranches(packages, repoRoot, loadModule)))

        return { violations, degraded, routeCount: routes.length, collectionSlugs }
      },
      runner,
    ),
  )
}
