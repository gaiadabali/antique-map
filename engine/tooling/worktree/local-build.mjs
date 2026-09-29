// 3.5.g — `LOCAL_PRODUCTION_BUILD=1` in a worktree's .env.local. A production
// build at a loopback SITE_URL is judged local only with it (C1 v1.2 as amended,
// 3.4 senior-be #1; DEPLOYMENT.md §8): that is how a worktree opens a production
// build on its own port with draft configs and sandbox keys. A host's
// shared/.env never sets it, so this file writes it only into a worktree's
// gitignored .env.local.
//
// An existing value is never replaced, not even by `--force`: someone who set
// it to anything else did so on purpose, and bootCheck() reports a value other
// than `1`. A blank line (a copied .env.example) is not a value and is filled.
import { readEnvFile, writeEnvFile } from './env-file.mjs'

export const LOCAL_BUILD_VARIABLE = 'LOCAL_PRODUCTION_BUILD'

/** Writes `LOCAL_PRODUCTION_BUILD=1` into the env file at `path` unless it holds a value. Returns `'added'` or `'kept'`. */
export function ensureLocalProductionBuild(path) {
  const existing = readEnvFile(path).get(LOCAL_BUILD_VARIABLE)
  if (existing !== undefined && existing.trim() !== '') return 'kept'
  // `force` only ever replaces a BLANK line here — a value returned 'kept' above.
  writeEnvFile(path, { [LOCAL_BUILD_VARIABLE]: '1' }, { force: true })
  return 'added'
}
