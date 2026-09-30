/**
 * The restore harness's command line (TASKS.md 7.1.b, 7.1.f).
 *
 *   restore <dump.sql|dump.sql.gz> [--image mysql:8.4] [--replace] [--database <db>]
 *   schema  [--notes <file.md>] [--title <text>]  discover tables → schema.json (+ Markdown notes)
 *   extract --queries <dir>                         run named extraction queries → extract/*.jsonl
 *   tables                                          every table, losslessly → tables/*.jsonl
 *   destroy                                         remove the container and its volume
 *
 * Common: [--name <label>] (default "catalogue": the container is
 * migrate-legacy-<label>), [--data-dir <dir>] (else LEGACY_DATA_DIR). Output
 * lands in <data-dir>/mysql/<label>/ — outside git; only --notes is meant to
 * be committed.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parseArgs } from 'node:util'

import { legacyDataDir, resolveFromInvocation } from '../public-read/env.ts'
import { DEFAULT_IMAGE, containerState, removeContainer } from './docker.ts'
import { dumpTables, runQueries } from './extract.ts'
import { restoreDump, type RestoreReport } from './restore.ts'
import { discoverSchema, schemaMarkdown, type SchemaReport } from './schema.ts'

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    name: { type: 'string', default: 'catalogue' },
    'data-dir': { type: 'string' },
    image: { type: 'string', default: DEFAULT_IMAGE },
    database: { type: 'string' },
    replace: { type: 'boolean', default: false },
    queries: { type: 'string' },
    notes: { type: 'string' },
    title: { type: 'string' },
  },
})

function log(line: string): void {
  process.stdout.write(`[${new Date().toISOString()}] ${line}\n`)
}

function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

async function main(): Promise<void> {
  const [command, dumpArg] = positionals
  const label = values.name ?? 'catalogue'
  if (!/^[a-z0-9-]{1,40}$/.test(label)) throw new Error('--name is lower-case letters, digits, -')
  const container = `migrate-legacy-${label}`
  const outDir = join(legacyDataDir(values['data-dir']), 'mysql', label)
  const reportFile = join(outDir, 'restore.json')
  const readReport = (): RestoreReport => {
    if (!existsSync(reportFile))
      throw new Error(`no restore report at ${reportFile}: restore first`)
    return JSON.parse(readFileSync(reportFile, 'utf8')) as RestoreReport
  }
  const running = async () => {
    if ((await containerState(container)) !== 'running') {
      throw new Error(`${container} is not running: restore first`)
    }
  }

  switch (command) {
    case 'restore': {
      if (!dumpArg) throw new Error('usage: restore <dump.sql|dump.sql.gz>')
      const report = await restoreDump({
        dumpPath: resolveFromInvocation(dumpArg),
        container,
        image: values.image ?? DEFAULT_IMAGE,
        database: values.database,
        replace: values.replace,
        log,
      })
      writeJson(reportFile, report)
      log(
        `restored ${report.tables.length} tables, ${report.totalRows} rows into ${report.database} in ${report.durationMs} ms`,
      )
      for (const table of report.tables) log(`  ${table.table}: ${table.rows}`)
      log(`report: ${reportFile}`)
      return
    }
    case 'schema': {
      await running()
      const report = await discoverSchema(container, readReport().database)
      writeJson(join(outDir, 'schema.json'), report)
      log(`schema: ${report.tables.length} tables → ${join(outDir, 'schema.json')}`)
      if (values.notes) {
        const notes = resolveFromInvocation(values.notes)
        mkdirSync(dirname(notes), { recursive: true })
        writeFileSync(notes, schemaMarkdown(report, values.title ?? `Schema of ${label}`))
        log(`notes: ${notes}`)
      }
      return
    }
    case 'extract': {
      await running()
      if (!values.queries) throw new Error('usage: extract --queries <dir>')
      const results = await runQueries({
        container,
        database: readReport().database,
        queriesDir: resolveFromInvocation(values.queries),
        outDir: join(outDir, 'extract'),
      })
      writeJson(join(outDir, 'extract', 'summary.json'), results)
      for (const result of results) log(`  ${result.name}: ${result.rows} rows → ${result.file}`)
      return
    }
    case 'tables': {
      await running()
      const schemaFile = join(outDir, 'schema.json')
      const schema = existsSync(schemaFile)
        ? (JSON.parse(readFileSync(schemaFile, 'utf8')) as SchemaReport)
        : await discoverSchema(container, readReport().database)
      const results = await dumpTables({ container, schema, outDir: join(outDir, 'tables') })
      for (const result of results) log(`  ${result.name}: ${result.rows} rows`)
      return
    }
    case 'destroy': {
      const removed = await removeContainer(container)
      log(removed ? `removed ${container}` : `${container} was not there`)
      return
    }
    default:
      throw new Error('usage: cli.ts restore|schema|extract|tables|destroy [options]')
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
