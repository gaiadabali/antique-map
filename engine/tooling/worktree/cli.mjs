#!/usr/bin/env node
// Agent worktrees (TASKS.md 1.3, PARALLEL-TRACKS.md §3.1, CONVENTIONS.md §9).
//
//   pnpm worktree <phase> <lane> [--base <ref>] [--force]
//     Creates a sibling worktree of the main checkout on branch
//     feat/p<phase>-<lane> (reusing the branch if it exists), then writes its
//     .env.local. Re-running on an existing worktree only does the env step.
//
//   pnpm worktree:env <phase> <lane> [--force]
//     Writes .env.local in the worktree you are in (e.g. one the Agent tool
//     made with isolation: "worktree").
//
// .env.local gets PORT and DB_SUFFIX only. An existing key with a different
// value is kept unless --force is passed; nothing else in the file is touched.
import { existsSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

import {
  allocatePort,
  branchName,
  dbSuffix,
  parseLane,
  parsePhase,
  worktreeDirName,
} from './allocate.mjs'
import { readEnvFile, writeEnvFile } from './env-file.mjs'
import { addWorktree, listWorktrees, otherClaims, pathKey, topLevel } from './git.mjs'

const USAGE = `usage:
  pnpm worktree <phase> <lane> [--base <ref>] [--force]
  pnpm worktree:env <phase> <lane> [--force]

  <phase>   the TASKS.md phase number (1-60)
  <lane>    a PARALLEL-TRACKS.md §1 lane (HAR, SCH, ...) or a split such as ARC-P
  --base    the ref a new branch starts from (default: main)
  --force   overwrite PORT / DB_SUFFIX in .env.local when they differ`

const HEADER = [
  '# Local settings for this worktree (gitignored). PORT and DB_SUFFIX were',
  '# written by `pnpm worktree:env`; add secrets by hand, never commit them.',
]

class UsageError extends Error {}

function parseArgs(argv) {
  const args = { mode: 'create', positional: [], base: 'main', force: false }
  const rest = [...argv]
  if (rest[0] === 'env') {
    args.mode = 'env'
    rest.shift()
  }
  while (rest.length > 0) {
    const arg = rest.shift()
    if (arg === '--force') args.force = true
    else if (arg === '--base') {
      args.base = rest.shift()
      if (!args.base) throw new UsageError('--base needs a ref')
    } else if (arg === '-h' || arg === '--help') args.help = true
    else if (arg.startsWith('-')) throw new UsageError(`unknown option ${arg}`)
    else args.positional.push(arg)
  }
  if (args.help) return args
  if (args.positional.length !== 2) throw new UsageError('expected <phase> and <lane>')
  if (args.mode === 'env' && args.base !== 'main') {
    throw new UsageError('--base only applies to `pnpm worktree`')
  }
  return args
}

/** Writes PORT and DB_SUFFIX into `target`'s .env.local; returns what it wrote. */
function writeWorktreeEnv({ target, phase, lane, force = false, log = console.log }) {
  const claims = otherClaims(target, target)
  const suffix = dbSuffix(phase, lane)
  const clash = claims.find((claim) => claim.suffix === suffix)
  if (clash) {
    throw new Error(
      `DB_SUFFIX ${suffix} is already used by ${clash.path}. Two worktrees on one phase and lane ` +
        'would share databases: give this one a distinct lane label (e.g. ARC-P and ARC-D).',
    )
  }
  const used = new Set(claims.map((claim) => claim.port).filter((port) => port !== null))
  const port = allocatePort(phase, lane, used)
  const file = join(target, '.env.local')
  const wanted = { PORT: String(port), DB_SUFFIX: suffix }
  const outcome = writeEnvFile(file, wanted, { force, header: HEADER })

  log(`${file}`)
  for (const [key, value] of Object.entries(wanted)) {
    const note =
      outcome[key] === 'kept' ? ' (existing value differs, kept; --force overwrites)' : ''
    log(`  ${key}=${value}  ${outcome[key]}${note}`)
  }
  // A kept value was not allocated here, so it may clash; say so rather than guess.
  const final = readEnvFile(file)
  for (const claim of claims) {
    if (claim.port !== null && String(claim.port) === final.get('PORT')) {
      console.warn(`warning: PORT ${claim.port} is also used by ${claim.path}`)
    }
    if (claim.suffix !== null && claim.suffix === final.get('DB_SUFFIX')) {
      console.warn(`warning: DB_SUFFIX ${claim.suffix} is also used by ${claim.path}`)
    }
  }
  return { file, port, suffix, outcome }
}

function createWorktree({ phase, lane, base, force, cwd }) {
  const [main] = listWorktrees(cwd)
  const dir = join(dirname(main.path), worktreeDirName(basename(main.path), phase, lane))
  const branch = branchName(phase, lane)
  const known = listWorktrees(cwd).find((entry) => pathKey(entry.path) === pathKey(dir))

  if (known) {
    if (known.branch !== branch) {
      throw new Error(`${dir} is a worktree on ${known.branch ?? 'a detached HEAD'}, not ${branch}`)
    }
    console.log(`worktree ${dir} already exists on ${branch}; writing .env.local only`)
  } else {
    if (existsSync(dir)) throw new Error(`${dir} exists and is not a worktree of this repository`)
    addWorktree({ dir, branch, base, cwd: main.path })
    console.log(`created worktree ${dir} on ${branch}`)
  }
  writeWorktreeEnv({ target: dir, phase, lane, force })
  console.log(`next: cd "${dir}" && pnpm install`)
}

function main(argv) {
  const args = parseArgs(argv)
  if (args.help) {
    console.log(USAGE)
    return
  }
  const phase = parsePhase(args.positional[0])
  const lane = parseLane(args.positional[1])
  const cwd = process.cwd()
  if (args.mode === 'env') {
    writeWorktreeEnv({ target: topLevel(cwd), phase, lane, force: args.force })
  } else {
    createWorktree({ phase, lane, base: args.base, force: args.force, cwd })
  }
}

try {
  main(process.argv.slice(2))
} catch (error) {
  const detail = error.stderr ? String(error.stderr).trim() : error.message
  console.error(`worktree: ${detail}`)
  if (error instanceof UsageError) console.error(USAGE)
  process.exitCode = error instanceof UsageError ? 2 : 1
}
