#!/usr/bin/env node
// Applies a storage plan's bucket and key policies (TASKS.md 8.3.c) through MinIO's client, `mc`,
// which RustFS answers too (D12; TASKS.md 41.2 confirms it there before relying on it).
//
//   pnpm --filter @engine/media storage:policies [--plan <file>] [--mc docker:<container> | <mc>]
//                                                [--target <mc alias>] [--secrets derive | env]
//                                                [--dry-run]
//
//   --plan     a plan file (default: ../plans/local.json, the workstation's MinIO)
//   --mc       how mc runs: `docker:<container>` execs the dev container's own mc (default
//              docker:indies-platform-dev-minio-1, docker-compose.dev.yml's MinIO), anything else
//              is an mc binary on this machine, its alias set up beforehand (MC_HOST_<alias>)
//   --target   the mc alias to apply to (default: local — the dev container's root alias)
//   --secrets  derive: each user's secret derived from the root secret (STORAGE_ROOT_SECRET,
//              else the dev container's documented minioadmin), allowed only with docker:
//              env: each user's secret from STORAGE_SECRET_<USER> (a host's, from Infisical)
//   --dry-run  print what would be applied, and apply nothing
//
// Idempotent: re-running replaces each policy document and secret with the plan's. Secrets are
// passed to mc as arguments and never printed; on a shared host, run it where no other user can
// read the process list.
import { spawnSync } from 'node:child_process'
import console from 'node:console'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  deriveLocalSecret,
  describe,
  mcCommand,
  mcUserPolicyCommands,
  planOperations,
  POLICY_FILE,
  secretVariable,
  stalePolicies,
} from './plan.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const DEFAULTS = {
  plan: join(here, '..', 'plans', 'local.json'),
  mc: 'docker:indies-platform-dev-minio-1',
  target: 'local',
  secrets: 'derive',
  dryRun: false,
}
// The dev container's root secret, as docker-compose.dev.yml sets it: a workstation's only.
const DEV_ROOT_SECRET = 'minioadmin'

function parseArgs(argv) {
  const options = { ...DEFAULTS }
  const rest = [...argv]
  while (rest.length > 0) {
    const arg = rest.shift()
    if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--plan') options.plan = resolve(rest.shift() ?? '')
    else if (arg === '--mc') options.mc = rest.shift()
    else if (arg === '--target') options.target = rest.shift()
    else if (arg === '--secrets') options.secrets = rest.shift()
    else throw new Error(`unknown option ${arg}`)
  }
  if (!['derive', 'env'].includes(options.secrets)) throw new Error('--secrets is derive or env')
  if (options.secrets === 'derive' && !options.mc?.startsWith('docker:')) {
    throw new Error('--secrets derive is for the dev container only (--mc docker:<container>)')
  }
  return options
}

function secretSource(options) {
  if (options.secrets === 'derive') {
    const root = process.env.STORAGE_ROOT_SECRET || DEV_ROOT_SECRET
    return (user) => deriveLocalSecret(root, user)
  }
  return (user) => {
    const value = process.env[secretVariable(user)]
    if (!value || value.length < 8 || value.length > 40 || value.startsWith('-')) {
      throw new Error(
        `${secretVariable(user)} must hold the user's secret: 8–40 characters, not starting with "-"`,
      )
    }
    return value
  }
}

function spawn(command, args, input) {
  const result = spawnSync(command, args, { input: input ?? '', encoding: 'utf8' })
  return { status: result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim() }
}

/**
 * mc reads a policy document from a file — handed `/dev/stdin`, it reads an EOF — so it is
 * written to a file first: inside the dev container, or in this machine's temp folder.
 */
function withDocumentFile(options, document, run) {
  if (document === undefined) return run(null)
  if (options.mc.startsWith('docker:')) {
    const container = options.mc.slice('docker:'.length)
    const file = '/tmp/indies-storage-policy.json'
    const written = spawn(
      'docker',
      ['exec', '-i', container, 'sh', '-c', `cat > ${file}`],
      document,
    )
    if (written.status !== 0) throw new Error(`could not stage the policy: ${written.output}`)
    return run(file)
  }
  const dir = mkdtempSync(join(tmpdir(), 'indies-storage-'))
  try {
    const file = join(dir, 'policy.json')
    writeFileSync(file, document)
    return run(file)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function runMc(options, { args, document, alreadyDone, secret }) {
  const [command, prefix] = options.mc.startsWith('docker:')
    ? ['docker', ['exec', '-i', options.mc.slice('docker:'.length), 'mc']]
    : [options.mc, []]
  const { status, output } = withDocumentFile(options, document, (file) =>
    spawn(command, [...prefix, ...args.map((arg) => (arg === POLICY_FILE && file ? file : arg))]),
  )
  if (status === 0 || (alreadyDone && alreadyDone.test(output))) return
  // mc's own words, never the arguments, and with the secret struck out: mc echoes an argument
  // it cannot parse.
  const words = secret ? output.replaceAll(secret, '<secret>') : output
  throw new Error(`mc ${args.slice(0, 3).join(' ')} failed (${status}): ${words}`)
}

/** Leaves a user holding the plan's one policy and no other (`stalePolicies()`). */
function detachStale(options, { user, policy }) {
  const commands = mcUserPolicyCommands(options.target, user)
  const [command, prefix] = options.mc.startsWith('docker:')
    ? ['docker', ['exec', '-i', options.mc.slice('docker:'.length), 'mc']]
    : [options.mc, []]
  const info = spawn(command, [...prefix, ...commands.info])
  if (info.status !== 0) throw new Error(`mc admin user info ${user} failed: ${info.output}`)
  for (const stale of stalePolicies(info.output, policy)) {
    console.log(`    detach ${stale} from ${user}`)
    runMc(options, { args: commands.detach(stale) })
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  const plan = JSON.parse(readFileSync(options.plan, 'utf8'))
  const operations = planOperations(plan, { secretFor: secretSource(options) })
  console.log(`storage:policies: ${operations.length} operation(s) from ${options.plan}`)
  for (const operation of operations) {
    console.log(`  ${options.dryRun ? 'would apply' : 'apply'} ${describe(operation)}`)
    if (options.dryRun) continue
    runMc(options, mcCommand(operation, options.target))
    if (operation.kind === 'attach') detachStale(options, operation)
  }
  console.log(
    options.dryRun ? 'storage:policies: dry run, nothing applied' : 'storage:policies: done',
  )
}

try {
  main()
} catch (error) {
  console.error(`storage:policies: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
