/**
 * Plants a vulnerability from each of the four classes of TASKS.md 10.1.e, runs the test that
 * guards it, and puts the code back (SECURITY.md §3; WORKFLOW.md §6: "a test that fails on the
 * planted violation"):
 *
 *   node tests/security/plants/run-plants.mjs            # all four
 *   node tests/security/plants/run-plants.mjs idor xss   # some
 *
 * For each plant: the target file must be clean in git; the plant is a one-spot text edit that
 * must change the file; the guarding test file must then FAIL; the file is restored with
 * `git checkout --` whatever happens, and the same test file is run once more and must pass. The
 * planted edit is never committed. Needs `CMS_TEST_POSTGRES_URL` for the three database classes.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()

const PLANTS = {
  idor: {
    what: 'a store user may read and update every store’s orders (ownStoreOrders returns true)',
    file: 'engine/packages/cms/src/collections/orders/access.ts',
    find: /return store === null \? false : \{ store: \{ equals: store \} \}/,
    replace: 'return true',
    test: 'tests/security/idor-order.db.test.ts',
  },
  replay: {
    what: 'the ledger’s dedupe key differs on every delivery, so a replay is never recognised',
    file: 'engine/packages/cms/src/shop/payments/notification.ts',
    find: /status\.statusCode,(\r?\n\s*)\]\.join\('\|'\)/,
    replace: "status.statusCode,$1String(Math.random()),$1].join('|')",
    test: 'tests/security/webhook-replay.db.test.ts',
  },
  xss: {
    what: 'the leads inbox renders a visitor’s message as HTML (dangerouslySetInnerHTML)',
    file: 'engine/packages/cms/src/admin/leads/inbox.jsx',
    find: /\{message && <div style=\{\{ fontSize: 14, marginTop: 4 \}\}>\{message\}<\/div>\}/,
    replace:
      '{message && <div style={{ fontSize: 14, marginTop: 4 }} dangerouslySetInnerHTML={{ __html: message }} />}',
    test: 'tests/security/lead-note-xss.test.ts',
  },
  upload: {
    what: 'the driver-image check trusts any non-empty bytes as a JPEG (no sniffing)',
    file: 'engine/packages/cms/src/shop/fulfilment/image.ts',
    find: /export function sniffImageType\(bytes: Uint8Array\): SniffedType \| null \{/,
    replace:
      "export function sniffImageType(bytes: Uint8Array): SniffedType | null {\n  if (bytes.length > 0) return 'image/jpeg'",
    test: 'tests/security/upload-script.db.test.ts',
  },
}

const vitest = (testFile) =>
  spawnSync(
    'pnpm',
    ['vitest', 'run', '--config', 'tests/security/vitest.config.ts', testFile, '--reporter=verbose'],
    { cwd: root, encoding: 'utf8', shell: true, env: process.env, maxBuffer: 64 * 1024 * 1024 },
  )

const summary = (output) => {
  const lines = output.split(/\r?\n/)
  const failed = lines.filter((line) => /^\s*×\s/.test(line)).map((line) => line.trim().replace(/^×\s*\|security\|\s*/, ''))
  const tests = lines.find((line) => /^\s*Tests\s/.test(line))?.trim() ?? 'no test summary'
  return { tests, failed }
}

const wanted = process.argv.slice(2)
const chosen = Object.entries(PLANTS).filter(([name]) => wanted.length === 0 || wanted.includes(name))
let ok = true

for (const [name, plant] of chosen) {
  const target = path.join(root, plant.file)
  if (git('status', '--porcelain', '--', plant.file) !== '') {
    console.log(`[${name}] SKIPPED: ${plant.file} has uncommitted changes`)
    ok = false
    continue
  }
  const original = readFileSync(target, 'utf8')
  const planted = original.replace(plant.find, plant.replace)
  if (planted === original) {
    console.log(`[${name}] SKIPPED: the planting spot was not found in ${plant.file}`)
    ok = false
    continue
  }
  let caught
  try {
    writeFileSync(target, planted)
    caught = vitest(plant.test)
  } finally {
    git('checkout', '--', plant.file)
  }
  const restored = git('status', '--porcelain', '--', plant.file) === ''
  const after = vitest(plant.test)
  const planting = summary(caught.stdout + caught.stderr)
  const reverted = summary(after.stdout + after.stderr)
  const detected = caught.status !== 0 && planting.failed.length > 0
  ok &&= detected && restored && after.status === 0
  console.log(
    JSON.stringify(
      {
        class: name,
        planted: plant.what,
        file: plant.file,
        guardedBy: plant.test,
        withPlant: { exit: caught.status, ...planting, failed: planting.failed.slice(0, 6) },
        detected,
        fileRestored: restored,
        afterRevert: { exit: after.status, tests: reverted.tests },
      },
      null,
      2,
    ),
  )
}
process.exit(ok ? 0 : 1)
