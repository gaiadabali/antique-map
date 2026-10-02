// The CMS package's own generator scripts (engine/packages/cms/package.json,
// TASKS.md 3.2.c–d), run as `pnpm --filter @engine/cms run <script>` in the
// environment from `contexts.mjs`. Each call is one Payload process (~5 s), so
// runs are memoised per (script, arguments) and bounded in number; nothing
// here ever writes a committed file for good (see `importMap()`).
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { availableParallelism, tmpdir } from 'node:os'
import { join } from 'node:path'

import { runPnpm } from '../db/pnpm.mjs'
import { generatorEnv } from './contexts.mjs'

export const CMS_PACKAGE = '@engine/cms'
export const PAYLOAD_TYPES = 'engine/packages/cms/payload-types.ts'

/** A counting semaphore: at most `limit` of the returned function's tasks at once. */
export function limiter(limit) {
  let active = 0
  const queue = []
  const next = () => {
    if (active >= limit || queue.length === 0) return
    active += 1
    const { task, resolve, reject } = queue.shift()
    task()
      .then(resolve, reject)
      .finally(() => {
        active -= 1
        next()
      })
  }
  return (task) =>
    new Promise((resolve, reject) => {
      queue.push({ task, resolve, reject })
      next()
    })
}

const defaultLimit = Math.max(1, Math.min(4, availableParallelism() - 1))

/** Scripts bound to one repository: `run(script, args)` → `{ code, stdout, stderr }`. */
export function cmsScripts(repoRoot, { limit = defaultLimit, parentEnv = process.env } = {}) {
  const bounded = limiter(limit)
  const memo = new Map()

  function run(script, args, extraEnv = {}) {
    const argv = ['--silent', '--filter', CMS_PACKAGE, 'run', script, ...args]
    const env = { ...generatorEnv(parentEnv), ...extraEnv }
    return bounded(() => runPnpm(argv, { cwd: repoRoot, env }))
  }

  /** The script's stdout when it exits 0; otherwise throws with its stderr's last lines. */
  async function output(script, args, extraEnv) {
    const { code, stdout, stderr } = await run(script, args, extraEnv)
    if (code !== 0) {
      const tail = stderr.trim().split('\n').slice(-6).join(' | ')
      throw new Error(`${script} ${args.join(' ')} exited ${code}: ${tail}`)
    }
    return stdout
  }

  function memoised(key, make) {
    if (!memo.has(key)) memo.set(key, make())
    return memo.get(key)
  }

  return {
    run,

    /**
     * `payload-types.ts` as `generate:types` writes it — Payload's `generate:types`
     * with its output sent to a temporary file (`PAYLOAD_TS_OUTPUT_PATH`), then the
     * script's own `prettier --write` step applied as for the committed path, so
     * the committed file is never rewritten by a check.
     */
    payloadTypes: () =>
      memoised('types', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'check-generated-'))
        const file = join(dir, 'payload-types.ts')
        try {
          await output('payload', ['generate:types'], { PAYLOAD_TS_OUTPUT_PATH: file })
          const raw = readFileSync(file, 'utf8')
          return await prettierAs(repoRoot, PAYLOAD_TYPES, raw, parentEnv)
        } finally {
          rmSync(dir, { recursive: true, force: true })
        }
      }),

    /**
     * An app's `importMap.js` from `generate:importmap <app>`. The script writes
     * into the app (Payload finds the file under ROOT_DIR), so the committed file
     * is read first and put back after, whatever happened; runs for one file are
     * serialised by the caller (`generators.mjs`).
     */
    importMap: (app, committedAbs) =>
      memoised(`importmap ${app}`, async () => {
        const before = readOrNull(committedAbs)
        try {
          await output('generate:importmap', [app])
          return readFileSync(committedAbs, 'utf8')
        } finally {
          if (before === null) rmSync(committedAbs, { force: true })
          else writeFileSync(committedAbs, before)
        }
      }),
  }
}

function readOrNull(file) {
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return null
  }
}

/** `text` formatted by the repository's Prettier exactly as it would format `repoPath`. */
function prettierAs(repoRoot, repoPath, text, parentEnv) {
  const bin = join(repoRoot, 'node_modules', 'prettier', 'bin', 'prettier.cjs')
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [bin, '--stdin-filepath', repoPath], {
      cwd: repoRoot,
      env: parentEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })
    const out = []
    const err = []
    child.stdout.on('data', (chunk) => out.push(chunk))
    child.stderr.on('data', (chunk) => err.push(chunk))
    child.on('error', reject)
    child.on('close', (code) =>
      code === 0
        ? resolve(Buffer.concat(out).toString('utf8'))
        : reject(new Error(`prettier exited ${code}: ${Buffer.concat(err).toString('utf8')}`)),
    )
    child.stdin.end(text)
  })
}
