/**
 * The throwaway MySQL container the export is restored into (MIGRATION.md
 * §3). It publishes no port — everything goes through `docker exec` — and its
 * root password is generated per container, handed to `docker run` through
 * the environment (never on a command line) and read inside the container
 * from its own environment, so it is never printed, logged or stored.
 */
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createWriteStream } from 'node:fs'

export const DEFAULT_IMAGE = 'mysql:8.4'
export const CONTAINER_LABEL = 'engine.migrate.role=throwaway-restore'

export type RunResult = { code: number; stdout: string; stderr: string }

export function run(
  command: string,
  args: string[],
  options: { input?: string; env?: NodeJS.ProcessEnv; stdoutFile?: string } = {},
): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: options.env ?? process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })
    const out: Buffer[] = []
    const err: Buffer[] = []
    const file = options.stdoutFile ? createWriteStream(options.stdoutFile) : null
    if (file !== null) child.stdout.pipe(file)
    else child.stdout.on('data', (chunk: Buffer) => out.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => err.push(chunk))
    child.on('error', reject)
    child.on('close', (code) => {
      const finish = () =>
        resolve({
          code: code ?? 1,
          stdout: Buffer.concat(out).toString('utf8'),
          stderr: Buffer.concat(err).toString('utf8'),
        })
      if (file !== null) file.end(finish)
      else finish()
    })
    child.stdin.end(options.input ?? '')
  })
}

/**
 * The mysql client inside the container, as root over TCP (which only the
 * real server answers — the image's init-time server runs without
 * networking), in batch mode with raw output so a JSON line is printed
 * exactly as the server produced it.
 */
const MYSQL = [
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot -h127.0.0.1 --protocol=TCP',
  '--default-character-set=utf8mb4 --max-allowed-packet=1G --batch --raw --skip-column-names "$@"',
].join(' ')

export function mysqlArgs(container: string, clientArgs: string[]): string[] {
  return ['exec', '-i', container, 'bash', '-c', MYSQL, 'mysql', ...clientArgs]
}

export async function assertDocker(): Promise<void> {
  const result = await run('docker', ['version', '--format', '{{.Server.Version}}']).catch(
    () => null,
  )
  if (result === null || result.code !== 0) {
    throw new Error('docker is not available: the restore needs a local Docker engine')
  }
}

export async function containerState(name: string): Promise<'running' | 'stopped' | 'absent'> {
  const result = await run('docker', ['inspect', '--format', '{{.State.Running}}', name])
  if (result.code !== 0) return 'absent'
  return result.stdout.trim() === 'true' ? 'running' : 'stopped'
}

export async function startContainer(name: string, image: string): Promise<void> {
  const password = randomBytes(24).toString('base64url')
  const args = [
    'run',
    '--detach',
    '--name',
    name,
    '--label',
    CONTAINER_LABEL,
    '--env',
    'MYSQL_ROOT_PASSWORD', // the value comes from this process's environment, below
    image,
    '--character-set-server=utf8mb4',
    '--collation-server=utf8mb4_unicode_ci',
    '--max-allowed-packet=1G',
    // A 5.7 dump may hold zero dates and loose values; mysqldump sets its own
    // session mode, and the server's stays permissive for dumps that do not.
    '--sql-mode=NO_ENGINE_SUBSTITUTION',
    '--skip-log-bin',
    '--innodb-flush-log-at-trx-commit=2',
    '--local-infile=0',
  ]
  const result = await run('docker', args, {
    env: { ...process.env, MYSQL_ROOT_PASSWORD: password },
  })
  if (result.code !== 0) throw new Error(`docker run failed: ${result.stderr.trim()}`)
}

export async function waitUntilReady(name: string, timeoutMs = 180_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const probe = await run('docker', mysqlArgs(name, ['-e', 'SELECT 1']))
    if (probe.code === 0 && probe.stdout.trim() === '1') return
    if ((await containerState(name)) !== 'running') {
      const logs = await run('docker', ['logs', '--tail', '30', name])
      throw new Error(`the MySQL container stopped while starting:\n${logs.stderr}${logs.stdout}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error(`MySQL in ${name} was not ready after ${timeoutMs / 1000}s`)
}

export async function removeContainer(name: string): Promise<boolean> {
  const result = await run('docker', ['rm', '--force', '--volumes', name])
  return result.code === 0
}

/** Runs `sql` in `database` and returns stdout, throwing with the server's message on failure. */
export async function query(container: string, database: string | null, sql: string) {
  const args = database === null ? [] : [`--database=${database}`]
  const result = await run('docker', mysqlArgs(container, args), { input: sql })
  if (result.code !== 0) throw new Error(`mysql: ${result.stderr.trim()}`)
  return result.stdout
}

/** As `query`, streaming stdout into `file` — for extracts too large to hold in memory. */
export async function queryToFile(container: string, database: string, sql: string, file: string) {
  const result = await run('docker', mysqlArgs(container, [`--database=${database}`]), {
    input: sql,
    stdoutFile: file,
  })
  if (result.code !== 0) throw new Error(`mysql: ${result.stderr.trim()}`)
}

/** One JSON value per output line (the queries select `JSON_OBJECT(...)`). */
export function jsonLines<T>(stdout: string): T[] {
  return stdout
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as T)
}
