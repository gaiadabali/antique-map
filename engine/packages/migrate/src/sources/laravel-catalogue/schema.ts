/**
 * Schema discovery for a restored dump (TASKS.md 7.1.b): every table, column,
 * index and foreign key from information_schema, with exact row counts, and
 * each column flagged when its name says it holds personal data or a secret
 * — so the notes that map tables to collections start from the facts, and the
 * extraction queries know which columns never leave the container.
 */
import { jsonLines, query } from './docker.ts'
import { assertIdentifier, countRows } from './restore.ts'

export type ColumnReport = {
  column: string
  type: string
  nullable: boolean
  default: string | null
  key: string
  extra: string
  /** `secret` never leaves the container; `personal` leaves only for the customer import (MIGRATION.md §5). */
  sensitivity: 'secret' | 'personal' | null
}

export type TableReport = {
  table: string
  engine: string | null
  collation: string | null
  rows: number
  columns: ColumnReport[]
  indexes: Array<{ name: string; unique: boolean; columns: string[] }>
  foreignKeys: Array<{ column: string; references: string }>
}

export type SchemaReport = {
  database: string
  discoveredAt: string
  tables: TableReport[]
  views: string[]
  triggers: string[]
  routines: string[]
}

const SECRET = /(^|_)(password|remember_token|token|secret|api_key|two_factor)(_|$)/i
const PERSONAL =
  /(^|_)(email|phone|mobile|address|name|first_name|last_name|ip|ip_address|user_agent|city|postcode|zip)(_|$)/i

export function sensitivityOf(table: string, column: string): ColumnReport['sensitivity'] {
  if (SECRET.test(column)) return 'secret'
  // `name` is personal on people tables, not on a category or a maker.
  if (column === 'name' && !/user|customer|subscriber|request|order|contact|member/i.test(table)) {
    return null
  }
  return PERSONAL.test(column) ? 'personal' : null
}

type ColumnRow = Omit<ColumnReport, 'sensitivity'> & { table: string }

export async function discoverSchema(container: string, database: string): Promise<SchemaReport> {
  const db = assertIdentifier(database, 'database')
  const tables = jsonLines<{ table: string; engine: string | null; collation: string | null }>(
    await query(
      container,
      null,
      `SELECT JSON_OBJECT('table', TABLE_NAME, 'engine', ENGINE, 'collation', TABLE_COLLATION)
       FROM information_schema.TABLES WHERE TABLE_SCHEMA = '${db}' AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME;`,
    ),
  )
  const columns = jsonLines<ColumnRow>(
    await query(
      container,
      null,
      `SELECT JSON_OBJECT('table', TABLE_NAME, 'column', COLUMN_NAME, 'type', COLUMN_TYPE,
         'nullable', IS_NULLABLE = 'YES', 'default', COLUMN_DEFAULT, 'key', COLUMN_KEY, 'extra', EXTRA)
       FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = '${db}'
       ORDER BY TABLE_NAME, ORDINAL_POSITION;`,
    ),
  )
  const indexes = jsonLines<{ table: string; name: string; unique: boolean; columns: string }>(
    await query(
      container,
      null,
      `SELECT JSON_OBJECT('table', TABLE_NAME, 'name', INDEX_NAME, 'unique', NON_UNIQUE = 0,
         'columns', GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX))
       FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = '${db}'
       GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE ORDER BY TABLE_NAME, INDEX_NAME;`,
    ),
  )
  const foreignKeys = jsonLines<{ table: string; column: string; references: string }>(
    await query(
      container,
      null,
      `SELECT JSON_OBJECT('table', TABLE_NAME, 'column', COLUMN_NAME,
         'references', CONCAT(REFERENCED_TABLE_NAME, '.', REFERENCED_COLUMN_NAME))
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = '${db}' AND REFERENCED_TABLE_NAME IS NOT NULL
       ORDER BY TABLE_NAME, COLUMN_NAME;`,
    ),
  )
  const names = (sql: string) => jsonLines<{ name: string }>(sql).map((row) => row.name)
  const views = names(
    await query(
      container,
      null,
      `SELECT JSON_OBJECT('name', TABLE_NAME) FROM information_schema.VIEWS WHERE TABLE_SCHEMA = '${db}';`,
    ),
  )
  const triggers = names(
    await query(
      container,
      null,
      `SELECT JSON_OBJECT('name', TRIGGER_NAME) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = '${db}';`,
    ),
  )
  const routines = names(
    await query(
      container,
      null,
      `SELECT JSON_OBJECT('name', ROUTINE_NAME) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = '${db}';`,
    ),
  )
  const counts = new Map((await countRows(container, db)).map((row) => [row.table, row.rows]))

  return {
    database: db,
    discoveredAt: new Date().toISOString(),
    tables: tables.map((table) => ({
      table: table.table,
      engine: table.engine,
      collation: table.collation,
      rows: counts.get(table.table) ?? 0,
      columns: columns
        .filter((column) => column.table === table.table)
        .map(({ table: owner, ...column }) => ({
          ...column,
          sensitivity: sensitivityOf(owner, column.column),
        })),
      indexes: indexes
        .filter((index) => index.table === table.table)
        .map((index) => ({
          name: index.name,
          unique: index.unique,
          columns: index.columns.split(','),
        })),
      foreignKeys: foreignKeys
        .filter((key) => key.table === table.table)
        .map((key) => ({ column: key.column, references: key.references })),
    })),
    views,
    triggers,
    routines,
  }
}

/** The report as Markdown, for the committed schema notes — structure and counts, never a row. */
export function schemaMarkdown(report: SchemaReport, title: string): string {
  const lines = [
    `# ${title}`,
    '',
    `Generated by \`legacy:mysql schema\` from database \`${report.database}\` — structure and exact row counts only, never a row. Columns marked **secret** never leave the container; **personal** ones leave only for the customer import (MIGRATION.md §5).`,
    '',
    '| Table | Rows | Columns |',
    '| --- | ---: | ---: |',
    ...report.tables.map((t) => `| \`${t.table}\` | ${t.rows} | ${t.columns.length} |`),
    '',
    `Views: ${report.views.length} · triggers: ${report.triggers.length} · routines: ${report.routines.length}`,
  ]
  for (const table of report.tables) {
    lines.push(
      '',
      `## \`${table.table}\` — ${table.rows} rows`,
      '',
      '| Column | Type | Null | Key | Flag |',
      '| --- | --- | --- | --- | --- |',
    )
    for (const column of table.columns) {
      const flag = column.sensitivity === null ? '' : `**${column.sensitivity}**`
      lines.push(
        `| \`${column.column}\` | \`${column.type}\` | ${column.nullable ? 'yes' : 'no'} | ${column.key} | ${flag} |`,
      )
    }
    if (table.foreignKeys.length > 0) {
      lines.push(
        '',
        `Foreign keys: ${table.foreignKeys.map((k) => `${k.column} → ${k.references}`).join(', ')}`,
      )
    }
  }
  return `${lines.join('\n')}\n`
}
