// Runs a workspace script the way a person would — `pnpm --filter <package>
// <script>` — from a tooling CLI (TASKS.md 3.5): `db:fresh`'s migrate hook and
// `check:generated`'s generators. The child gets exactly the environment it is
// handed (`env`), never this process's merged with a guess: the Payload CLI run
// from a package folder does not read the repo root's `.env.local`, and a
// generator must not see a DATABASE_URL, so callers build `env` on purpose.
//
// pnpm itself: the JS entry pnpm names in `npm_execpath` when there is one
// (run under `pnpm run`), else `pnpm` on PATH — a native binary on this
// project's workstations and CI; a `.cmd` shim on Windows needs a shell, so an
// ENOENT there retries through one (the arguments are this code's own words,
// never user input).
import { spawn } from 'node:child_process'

/** `{ bin, args }` for `pnpm <args>`, from `env`. Pure, so it is unit-tested. */
export function pnpmCommand(args, env = process.env) {
  const execPath = env.npm_execpath ?? ''
  if (/\.[cm]?js$/.test(execPath) && /pnpm/i.test(execPath)) {
    return { bin: process.execPath, args: [execPath, ...args] }
  }
  return { bin: 'pnpm', args }
}

function run(bin, args, { env, cwd, shell, echo }) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd,
      env,
      shell,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const stdout = []
    const stderr = []
    child.stdout.on('data', (chunk) => {
      stdout.push(chunk)
      echo?.stdout?.(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr.push(chunk)
      echo?.stderr?.(chunk)
    })
    child.on('error', reject)
    child.on('close', (code) =>
      resolve({
        code: code ?? 1,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
      }),
    )
  })
}

/**
 * Runs `pnpm <args>` in `cwd` with exactly `env`; resolves `{ code, stdout,
 * stderr }` whatever the exit code (the caller decides what a failure means),
 * and rejects only when pnpm cannot be started at all. `echo` may forward
 * output as it arrives (`{ stdout(chunk), stderr(chunk) }`).
 */
export async function runPnpm(args, { env, cwd, echo } = {}) {
  const { bin, args: argv } = pnpmCommand(args, env)
  try {
    return await run(bin, argv, { env, cwd, shell: false, echo })
  } catch (error) {
    if (error.code !== 'ENOENT' || process.platform !== 'win32' || bin !== 'pnpm') throw error
    return run('pnpm', argv, { env, cwd, shell: true, echo })
  }
}

/**
 * `env` without the keys named — the way to hand a child less than this process
 * has. Case-insensitive, as Windows environment names are.
 */
export function withoutKeys(env, keys) {
  const drop = new Set(keys.map((key) => key.toUpperCase()))
  return Object.fromEntries(Object.entries(env).filter(([key]) => !drop.has(key.toUpperCase())))
}
