/**
 * Extraction by SQL (MIGRATION.md §3–4): the restored database answers
 * queries, one JSON object per row, streamed to JSON Lines files in
 * LEGACY_DATA_DIR. Two modes:
 *
 * - named queries — a folder of `*.sql` files, each selecting `JSON_OBJECT(...)`
 *   rows shaped for one entity (products with their images and categories,
 *   customers without their passwords…). The folder is data: the mock's live
 *   beside the mock dump; the real dump's are written once its schema is known.
 * - every table, losslessly — each column cast so nothing is lost on the way
 *   to JSON (decimals and dates as text, zero dates included; binary as
 *   base64), with columns the schema report marks `secret` left out.
 */
import { mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'

import { queryToFile } from './docker.ts'
import { assertIdentifier } from './restore.ts'
import type { SchemaReport } from './schema.ts'

export type ExtractResult = { name: string; rows: number; bytes: number; file: string }

/** Every line of an extract must be one JSON value; returns the row count. */
export function verifyJsonLines(file: string): number {
  const text = readFileSync(file, 'utf8')
  let rows = 0
  text.split('\n').forEach((line, index) => {
    if (line.trim() === '') return
    try {
      JSON.parse(line)
    } catch {
      throw new Error(`${basename(file)} line ${index + 1} is not JSON`)
    }
    rows += 1
  })
  return rows
}

export async function runQueries(options: {
  container: string
  database: string
  queriesDir: string
  outDir: string
}): Promise<ExtractResult[]> {
  mkdirSync(options.outDir, { recursive: true })
  const files = readdirSync(options.queriesDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
  if (files.length === 0) throw new Error(`no .sql files in ${options.queriesDir}`)
  const results: ExtractResult[] = []
  for (const file of files) {
    const name = file.replace(/\.sql$/, '')
    const out = join(options.outDir, `${name}.jsonl`)
    const sql = readFileSync(join(options.queriesDir, file), 'utf8')
    await queryToFile(options.container, options.database, sql, out)
    results.push({ name, rows: verifyJsonLines(out), bytes: statSync(out).size, file: out })
  }
  return results
}

function quoteIdentifier(name: string): string {
  return `\`${name.replace(/`/g, '``')}\``
}

function quoteString(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`
}

/** The SQL expression that carries a column into JSON without loss. */
export function columnExpression(column: string, type: string): string {
  const id = quoteIdentifier(column)
  const base = type.toLowerCase()
  if (/^(tiny|medium|long)?blob|^(var)?binary|^geometry|^point/.test(base))
    return `TO_BASE64(${id})`
  if (/^(datetime|timestamp|date|time|year)/.test(base)) return `CAST(${id} AS CHAR)`
  if (/^(decimal|numeric|float|double|real)/.test(base)) return `CAST(${id} AS CHAR)`
  if (/^bit/.test(base)) return `CAST(${id} AS UNSIGNED)`
  if (/^bigint/.test(base)) return `CAST(${id} AS CHAR)` // beyond a safe integer, as text
  return id
}

export function tableDumpSql(table: SchemaReport['tables'][number]): string {
  const pairs = table.columns
    .filter((column) => column.sensitivity !== 'secret')
    .map(
      (column) => `${quoteString(column.column)}, ${columnExpression(column.column, column.type)}`,
    )
  return `SELECT JSON_OBJECT(${pairs.join(', ')}) FROM ${quoteIdentifier(table.table)};\n`
}

export async function dumpTables(options: {
  container: string
  schema: SchemaReport
  outDir: string
}): Promise<ExtractResult[]> {
  mkdirSync(options.outDir, { recursive: true })
  const database = assertIdentifier(options.schema.database, 'database')
  const results: ExtractResult[] = []
  for (const table of options.schema.tables) {
    const out = join(options.outDir, `${table.table}.jsonl`)
    await queryToFile(options.container, database, tableDumpSql(table), out)
    const rows = verifyJsonLines(out)
    if (rows !== table.rows) {
      throw new Error(`${table.table}: extracted ${rows} rows, the table holds ${table.rows}`)
    }
    results.push({ name: table.table, rows, bytes: statSync(out).size, file: out })
  }
  return results
}
