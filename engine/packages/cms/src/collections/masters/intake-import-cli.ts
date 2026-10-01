/**
 * Imports an intake batch's manifest into `masters` (TASKS.md 8.3.f), from the bucket — where the
 * batch's `intake.json` sits beside its files (C9 `intakeManifestKey()`) — or from a file:
 *
 *   pnpm --filter @engine/cms exec payload run src/collections/masters/intake-import-cli.ts <brand> <batch>
 *   pnpm --filter @engine/cms exec payload run src/collections/masters/intake-import-cli.ts file=<path>
 *
 * Words, not `--flags`: `payload run` drops flags before the script sees them. It needs the
 * brand's DATABASE_URL and PAYLOAD_SECRET, and S3_ENDPOINT with the origin's MASTERS_* key. Safe
 * to run again: what is already recorded is left as it is (`./intake-import`). Exits 1 if any
 * entry failed, each failure named.
 */
import { readFileSync } from 'node:fs'

import { intakeManifestKey } from '@engine/media/contract'

import { cms } from '../../instance'
import { importIntakeManifest } from './intake-import'
import { parseIntakeManifest } from './intake-manifest'
import { mastersStoreFromEnv, STORE_MISSING } from './store'

/** A manifest is a few hundred entries; anything far larger is not one. */
const MANIFEST_MAX_BYTES = 10 * 1024 * 1024

async function readManifest(words: string[]): Promise<unknown> {
  const file = words.find((word) => word.startsWith('file='))?.slice('file='.length)
  if (file) return JSON.parse(readFileSync(file, 'utf8'))
  const [brand, batch] = words
  if (!brand || !batch) throw new Error('name the batch: <brand> <batch>, or file=<path>')
  const store = mastersStoreFromEnv()
  if (!store) throw new Error(STORE_MISSING)
  const key = intakeManifestKey(brand, batch)
  const text = await store.readText(key, MANIFEST_MAX_BYTES)
  if (text === null) throw new Error(`no manifest at ${key} in ${store.bucket}`)
  return JSON.parse(text)
}

let code = 0
const payload = await cms()
try {
  const parsed = parseIntakeManifest(await readManifest(process.argv.slice(2)))
  if ('problems' in parsed)
    throw new Error(`the manifest is not valid:\n  ${parsed.problems.join('\n  ')}`)
  const outcomes = await importIntakeManifest(payload, parsed.manifest)
  const count = (outcome: string) => outcomes.filter((o) => o.outcome === outcome).length
  console.log(
    `intake-import: ${parsed.manifest.brand}/${parsed.manifest.batch} — ${count('created')} created, ${count('existing')} already recorded, ${count('failed')} failed`,
  )
  for (const failure of outcomes.filter((o) => o.outcome === 'failed')) {
    code = 1
    console.error(`  ${failure.storageKey}: ${failure.reason}`)
  }
} catch (error) {
  code = 1
  console.error(`intake-import: ${error instanceof Error ? error.message : String(error)}`)
} finally {
  await payload.destroy()
}
process.exit(code)
