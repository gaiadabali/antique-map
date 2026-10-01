// qa's 5.4 third gate, L2 — loading every app's config in one process, from the repository's
// `cwd`, hides a config that branches on `process.cwd()` (Next builds each app from its own
// folder) or on what that folder's env files set. So each app's config is loaded in its own child
// process, `cwd` its folder, by Next's own loader (`./config-child.mjs`).
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const CHILD = fileURLToPath(new URL('./config-child.mjs', import.meta.url))
const MARKER = '@@resolved-config@@'

/**
 * `resolvedConfigOf` the config in `appDir`, as `next build` run there would load it.
 * `nextFrom` is where `next` is resolved from: the app itself, but for a fixture outside the repo.
 */
export async function loadResolvedConfig(appDir, { nextFrom = appDir } = {}) {
  const env = { ...process.env, NODE_ENV: 'production' }
  const { stdout } = await promisify(execFile)(process.execPath, [CHILD, appDir, nextFrom], {
    cwd: appDir,
    env,
    maxBuffer: 16 * 1024 * 1024,
  })
  const line = stdout.split('\n').find((each) => each.startsWith(MARKER))
  if (!line) throw new Error(`no resolved config from ${appDir}:\n${stdout}`)
  return JSON.parse(line.slice(MARKER.length))
}
