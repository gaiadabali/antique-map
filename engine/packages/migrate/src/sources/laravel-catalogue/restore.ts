/**
 * Restores a MySQL dump — any path, plain `.sql` or gzipped — into a fresh
 * throwaway container, by handing the file to the mysql client inside it.
 * The dump is never parsed here: NOW! lost rows by stream-parsing one
 * (MIGRATION.md §3), so MySQL reads it, and the first statement it refuses
 * stops the restore with the server's message and line number (no --force).
 *
 * A host's plain dump has no CREATE DATABASE; it lands in `legacy`. A dump
 * made with --databases carries its own USE, and the schema it created is
 * found afterwards — whichever user schema holds tables.
 */
import { createHash } from 'node:crypto'
import { createReadStream, statSync } from 'node:fs'
import { basename } from 'node:path'

import {
  assertDocker,
  containerState,
  jsonLines,
  query,
  removeContainer,
  run,
  startContainer,
  waitUntilReady,
} from './docker.ts'

export const DEFAULT_DATABASE = 'legacy'
const SYSTEM_SCHEMAS = ['mysql', 'information_schema', 'performance_schema', 'sys']

export type TableCount = { table: string; rows: number }

export type RestoreReport = {
  container: string
  image: string
  database: string
  dump: { file: string; bytes: number; sha256: string; gzip: boolean }
  restoredAt: string
  durationMs: number
  tables: TableCount[]
  totalRows: number
}

/**
 * MySQL quotes the statement it refused ("… near '<row data>' at line 1"); a real dump's row
 * may be a customer's, so the message keeps the error and the dump's line number and withholds
 * the quoted content.
 */
export function withholdContent(stderr: string): string {
  return stderr.trim().replace(/near '[\s\S]*$/, 'near … (dump content withheld)')
}

export function assertIdentifier(name: string, what: string): string {
  if (!/^[A-Za-z0-9_$]{1,64}$/.test(name)) throw new Error(`unsafe ${what} name: ${name}`)
  return name
}

function quoteIdentifier(name: string): string {
  return `\`${name.replace(/`/g, '``')}\``
}

async function sha256(file: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk as Buffer)
  return hash.digest('hex')
}

async function isGzip(file: string): Promise<boolean> {
  for await (const chunk of createReadStream(file, { start: 0, end: 1 })) {
    const bytes = chunk as Buffer
    return bytes[0] === 0x1f && bytes[1] === 0x8b
  }
  return false
}

/** The user schema the dump filled: `legacy`, unless the dump chose its own. */
export function pickDatabase(schemas: Array<{ schema: string; tables: number }>): string {
  const user = schemas.filter((row) => !SYSTEM_SCHEMAS.includes(row.schema) && row.tables > 0)
  if (user.length === 0) throw new Error('the dump created no tables')
  const preferred = user.find((row) => row.schema === DEFAULT_DATABASE)
  if (preferred !== undefined && user.length === 1) return preferred.schema
  const others = user.filter((row) => row.schema !== DEFAULT_DATABASE)
  if (others.length === 1 && others[0] !== undefined) return others[0].schema
  throw new Error(
    `the dump filled several schemas (${user.map((row) => row.schema).join(', ')}); pass --database`,
  )
}

/** Exact row counts — `COUNT(*)` per table, never information_schema's estimates. */
export async function countRows(container: string, database: string): Promise<TableCount[]> {
  const tables = jsonLines<{ table: string }>(
    await query(
      container,
      null,
      `SELECT JSON_OBJECT('table', TABLE_NAME) FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = '${assertIdentifier(database, 'database')}' AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME;`,
    ),
  )
  if (tables.length === 0) return []
  const sql = tables
    .map(
      ({ table }) =>
        `SELECT JSON_OBJECT('table', '${table.replace(/'/g, "''")}', 'rows', COUNT(*)) FROM ${quoteIdentifier(table)}`,
    )
    .join('\nUNION ALL\n')
  return jsonLines<TableCount>(await query(container, database, `${sql};`))
}

export async function restoreDump(options: {
  dumpPath: string
  container: string
  image: string
  database?: string
  replace?: boolean
  log?: (line: string) => void
}): Promise<RestoreReport> {
  const log = options.log ?? (() => {})
  const { dumpPath, container, image } = options
  assertIdentifier(container.replace(/-/g, '_'), 'container')
  const bytes = statSync(dumpPath).size
  const gzip = await isGzip(dumpPath)
  const digest = await sha256(dumpPath)
  await assertDocker()

  const state = await containerState(container)
  if (state !== 'absent') {
    if (!options.replace) throw new Error(`${container} exists; pass --replace or destroy it first`)
    await removeContainer(container)
  }
  const started = Date.now()
  log(`starting ${image} as ${container} (no published port)`)
  await startContainer(container, image)
  await waitUntilReady(container)
  await query(
    container,
    null,
    `CREATE DATABASE ${DEFAULT_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
  )

  const inside = `/tmp/restore/${gzip ? 'dump.sql.gz' : 'dump.sql'}`
  log(`copying ${basename(dumpPath)} (${bytes} bytes) into the container`)
  await run('docker', ['exec', container, 'mkdir', '-p', '/tmp/restore'])
  const copied = await run('docker', ['cp', dumpPath, `${container}:${inside}`])
  if (copied.code !== 0) throw new Error(`docker cp failed: ${copied.stderr.trim()}`)

  log('restoring (MySQL reads the dump; the first refused statement stops it)')
  const feed = gzip ? `gunzip -c ${inside}` : `cat ${inside}`
  const restore = await run('docker', [
    'exec',
    container,
    'bash',
    '-c',
    `set -o pipefail; ${feed} | MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -h127.0.0.1 --protocol=TCP --default-character-set=utf8mb4 --max-allowed-packet=1G ${DEFAULT_DATABASE}; status=$?; rm -f ${inside}; exit $status`,
  ])
  if (restore.code !== 0) throw new Error(`the restore failed: ${withholdContent(restore.stderr)}`)

  const schemas = jsonLines<{ schema: string; tables: number }>(
    await query(
      container,
      null,
      `SELECT JSON_OBJECT('schema', s.SCHEMA_NAME, 'tables', COUNT(t.TABLE_NAME))
       FROM information_schema.SCHEMATA s LEFT JOIN information_schema.TABLES t
         ON t.TABLE_SCHEMA = s.SCHEMA_NAME AND t.TABLE_TYPE = 'BASE TABLE'
       GROUP BY s.SCHEMA_NAME;`,
    ),
  )
  const database = options.database ?? pickDatabase(schemas)
  const tables = await countRows(container, assertIdentifier(database, 'database'))
  return {
    container,
    image,
    database,
    dump: { file: basename(dumpPath), bytes, sha256: digest, gzip },
    restoredAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    tables,
    totalRows: tables.reduce((sum, row) => sum + row.rows, 0),
  }
}
