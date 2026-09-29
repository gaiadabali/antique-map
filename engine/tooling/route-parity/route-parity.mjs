// 2.2.d — reads the `@engine/http` manifest (C13) and checks every invariant
// TASKS.md 2.2.d names. Degrades explicitly (a `degraded` entry, not a
// violation) wherever its input does not exist yet, per this ticket's brief.
import { join } from 'node:path'

import { checkAppMounts, discoverScaffoldedApps, readProxyMatcher } from './app-mounts.mjs'
import { discoverCollectionSlugs } from './collections.mjs'
import { findDuplicateMounts, findReservedSegmentCollisions, matchersEqual } from './rules.mjs'
import { withTsRunner } from './ts-runner.mjs'

const MANIFEST_PATH = ['engine', 'packages', 'http', 'src', 'manifest.ts']

/**
 * `opts.manifestAbsPath` and `opts.appsAbsDir` let a test point at fixtures
 * outside `repoRoot` (the real manifest and `engine/apps/*` are what CI
 * checks; production code never overrides them).
 */
export async function checkRouteParity(repoRoot, opts = {}) {
  const violations = []
  const degraded = []
  const manifestAbsPath = opts.manifestAbsPath ?? join(repoRoot, ...MANIFEST_PATH)
  const appsAbsDir = opts.appsAbsDir ?? join(repoRoot, 'engine', 'apps')

  return withTsRunner(repoRoot, async (loadModule) => {
    const manifest = await loadModule(manifestAbsPath)
    const routes = manifest.ENGINE_ROUTES
    const proxyMatcher = manifest.PROXY_MATCHER

    // Manifest-only invariants — always checkable, no app or CMS required.
    for (const path of findDuplicateMounts(routes)) {
      violations.push({ kind: 'duplicate-mount', path })
    }
    const { slugs: collectionSlugs, available } = discoverCollectionSlugs(repoRoot)
    if (!available) {
      degraded.push('collection-slug collisions: nothing to check yet — engine/packages/cms/src/collections does not exist (Payload boot is 3.2+); reserved-word collisions (payload-jobs, graphql) are still checked')
    }
    for (const collision of findReservedSegmentCollisions(routes, collectionSlugs)) {
      violations.push({ kind: 'reserved-segment-collision', ...collision })
    }

    // Per-app invariants — need a scaffolded `src/app` (phase 4).
    const apps = discoverScaffoldedApps(repoRoot, appsAbsDir)
    if (apps.length === 0) {
      degraded.push('app mounts and proxy matcher: nothing to check yet — no app under engine/apps/* has a src/app tree (phase 4, App shells, has not landed)')
    }
    for (const app of apps) {
      const appDir = join(appsAbsDir, app)
      const { missingFiles, methodMismatches } = await checkAppMounts(appDir, routes, loadModule)
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
        violations.push({ kind: 'proxy-matcher-mismatch', app, expected: proxyMatcher, actual: appMatcher })
      }
    }

    return { violations, degraded, routeCount: routes.length }
  })
}
