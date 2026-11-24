import { parseEnv } from 'node:util'

/** The port a workstation's Next server binds when nothing names one — Next's own default. */
export const DEFAULT_PORT = '3000'

/**
 * The one port a local Next server binds and the app builds its local origins on
 * (`originOf()` in @engine/config): the shell's `PORT`, else the app's `.env.local` `PORT`, else
 * 3000. `next dev` and `next start` read `PORT` only from the shell, while the app reads it from
 * `.env.local` too — left to themselves the two disagree, and the admin refuses its own pages'
 * requests as cross-origin.
 */
export function resolvePort(shellEnv, envFileText) {
  const fromShell = shellEnv.PORT?.trim()
  if (fromShell) return checked(fromShell, 'PORT in the shell')
  const fromFile = envFileText ? parseEnv(envFileText).PORT?.trim() : undefined
  if (fromFile) return checked(fromFile, 'PORT in .env.local')
  return DEFAULT_PORT
}

function checked(port, where) {
  if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error(`${where} is not a port: ${JSON.stringify(port)}`)
  }
  return port
}
