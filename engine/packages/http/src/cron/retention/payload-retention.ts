/**
 * The retention route's Payload-backed port: loaded by `./route` with `import()` once the caller
 * has authenticated, so nothing else evaluates the Payload config. The Local API runs as the server
 * — the route's own bearer is the access — and the sweep returns counts only.
 */
import { cms } from '@engine/cms/instance'
import { runRetention } from '@engine/cms/jobs/retention'

export async function sweep(now: Date) {
  return runRetention(await cms(), now)
}
