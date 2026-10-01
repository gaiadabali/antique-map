// TASKS.md 5.5.e — Next's own bundle as the gate (ARCHITECTURE.md §15): route parity loads each
// mount as Node would, but what a host runs is what `next build` bundled. So, after a production
// build, every engine route's handler — each `.next/server/app/api/x/**/route.js`, plus
// `api/health` and the brand-assets route — is read for the chunks it loads synchronously, and
// each of those for the modules it holds, through its `.map` sources and its `[project]/` module
// ids. A route whose synchronous chunks hold `engine/packages/cms` or Payload fails: it would load
// Payload before it read its request. A lazy `import()` chunk is allowed, by design — a handler's
// `payload-*.ts` module is loaded that way once the request is read.
//
// Started from qa's `route-chunks.mjs` (5.4's third gate), which found Payload in 0 of 41 routes
// on clean builds and in the mount the `react-server` plant reached.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/** A module that is Payload: cms's source, or an installed `payload` / `@payloadcms/*`. */
export const PAYLOAD_MODULE =
  /(?:^|\/)engine\/packages\/cms\/|(?:^|\/)node_modules\/(?:\.pnpm\/)?(?:payload|@payloadcms)[/@+]/

/** The routes that are engine routes, beside everything under `app/api/x/` (C13). */
const EXTRA_ROUTES = ['app/api/health/route.js', 'app/brand-assets/[...path]/route.js']

const posix = (path) => path.split('\\').join('/')
/** A map's source as a path: Turbopack URL-encodes them (`payload%403.90.2`, `%40payloadcms`). */
const decoded = (source) => {
  try {
    return decodeURIComponent(source)
  } catch {
    return source
  }
}

/** Every engine route's compiled handler under `serverDir` (an app's `.next/server`), sorted. */
export function findRouteFiles(serverDir) {
  const found = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walk(path)
      else if (name === 'route.js') found.push(path)
    }
  }
  const apiX = join(serverDir, 'app', 'api', 'x')
  if (existsSync(apiX)) walk(apiX)
  for (const extra of EXTRA_ROUTES)
    if (existsSync(join(serverDir, extra))) found.push(join(serverDir, extra))
  return found.sort()
}

/**
 * The chunks a compiled route loads before it runs: Turbopack's runtime loads each with
 * `R.c("server/chunks/…")` at the top of the entry, and those are all its synchronous chunks.
 * A chunk an `import()` needs is loaded by the chunk that imports it, only when it runs.
 */
export const syncChunksOf = (routeText) => [
  ...new Set([...routeText.matchAll(/\bR\.c\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1])),
]

/** Every source a chunk's `.map` names (sectioned or not), and every `[project]/` id its code names. */
export function sourcesOf(chunkFile) {
  const sources = new Set()
  const mapFile = `${chunkFile}.map`
  const mapped = existsSync(mapFile)
  if (mapped) {
    const map = JSON.parse(readFileSync(mapFile, 'utf8'))
    for (const source of map.sources ?? []) sources.add(source)
    for (const section of map.sections ?? [])
      for (const source of section.map?.sources ?? []) sources.add(source)
  }
  const code = readFileSync(chunkFile, 'utf8')
  for (const [, id] of code.matchAll(/\[project\]\/([^\s"'`\])]+)/g)) sources.add(id)
  return { sources: [...sources].map((source) => posix(decoded(source))), mapped }
}

/**
 * Scans one app's `.next/server`. Each route is `{ route, chunks, hits }`: `route` relative to
 * the server dir, `hits` each `chunk :: module` that is Payload. A chunk a route names that is not
 * on disk is a hit too, as is a route that names none: what it holds cannot be shown clean.
 */
export function scanServer(serverDir) {
  const nextDir = join(serverDir, '..')
  let mapped = 0
  let loads = 0
  const routes = findRouteFiles(serverDir).map((file) => {
    const chunks = syncChunksOf(readFileSync(file, 'utf8'))
    // A route naming no chunk was not read: Turbopack's format moved, and a scan that reads
    // nothing must not pass.
    const hits = chunks.length
      ? []
      : ['(none: no R.c chunk load found — the build format is not the one this scan reads)']
    for (const chunk of chunks) {
      const chunkFile = join(nextDir, chunk)
      loads += 1
      if (!existsSync(chunkFile)) {
        hits.push(`${chunk} :: (missing: the chunk is not on disk)`)
        continue
      }
      const { sources, mapped: hasMap } = sourcesOf(chunkFile)
      if (hasMap) mapped += 1
      for (const source of sources)
        if (PAYLOAD_MODULE.test(source)) hits.push(`${chunk} :: ${source}`)
    }
    return { route: posix(relative(serverDir, file)), chunks, hits: [...new Set(hits)] }
  })
  return { routes, mapped, loads }
}
