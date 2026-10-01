// The restore harness's pure parts: which schema a dump filled, which names
// are safe to interpolate, which columns are secret or personal, and how a
// column crosses into JSON without loss.
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { mysqlArgs } from '../docker.ts'
import { columnExpression, tableDumpSql, verifyJsonLines } from '../extract.ts'
import { assertIdentifier, pickDatabase, withholdContent } from '../restore.ts'
import { schemaMarkdown, sensitivityOf, type SchemaReport } from '../schema.ts'

describe('the restore', () => {
  it('finds the schema the dump filled', () => {
    const system = [
      { schema: 'mysql', tables: 30 },
      { schema: 'sys', tables: 1 },
    ]
    expect(pickDatabase([...system, { schema: 'legacy', tables: 15 }])).toBe('legacy')
    // a dump made with --databases created and USEd its own schema
    expect(
      pickDatabase([...system, { schema: 'legacy', tables: 0 }, { schema: 'shop_db', tables: 9 }]),
    ).toBe('shop_db')
    expect(() => pickDatabase([{ schema: 'legacy', tables: 0 }])).toThrow(/no tables/)
    expect(() =>
      pickDatabase([
        { schema: 'a', tables: 1 },
        { schema: 'b', tables: 1 },
      ]),
    ).toThrow(/--database/)
  })

  it('reports a refused statement by line, withholding the row it quotes', () => {
    const stderr = [
      'ERROR 1064 (42000) at line 192: You have an error in your SQL syntax;',
      "near ''customer.one@example.invalid','MOCK' at line 1",
      '',
    ].join(' ')
    const message = withholdContent(stderr)
    expect(message).toContain('ERROR 1064 (42000) at line 192')
    expect(message).not.toContain('example.invalid')
  })

  it('refuses a name it would have to quote', () => {
    expect(assertIdentifier('legacy_db', 'database')).toBe('legacy_db')
    expect(() => assertIdentifier("x'; DROP DATABASE y; --", 'database')).toThrow(/unsafe/)
  })

  it('keeps the root password off every command line', () => {
    const args = mysqlArgs('migrate-legacy-mock', ['--database=legacy'])
    expect(args.join(' ')).toContain('"$MYSQL_ROOT_PASSWORD"')
    expect(args.join(' ')).not.toMatch(/(^|\s)(--password|-p\S)/)
  })
})

describe('schema discovery', () => {
  it('flags secrets and personal data by column name', () => {
    expect(sensitivityOf('users', 'password')).toBe('secret')
    expect(sensitivityOf('users', 'remember_token')).toBe('secret')
    expect(sensitivityOf('password_resets', 'token')).toBe('secret')
    expect(sensitivityOf('users', 'email')).toBe('personal')
    expect(sensitivityOf('orders', 'shipping_address')).toBe('personal')
    expect(sensitivityOf('users', 'name')).toBe('personal')
    expect(sensitivityOf('categories', 'name')).toBeNull()
    expect(sensitivityOf('products', 'title')).toBeNull()
  })

  it('writes notes with structure and counts, never a row', () => {
    const report: SchemaReport = {
      database: 'legacy',
      discoveredAt: '2026-09-30T00:00:00.000Z',
      tables: [
        {
          table: 'users',
          engine: 'InnoDB',
          collation: 'utf8mb4_unicode_ci',
          rows: 5,
          columns: [
            {
              column: 'email',
              type: 'varchar(191)',
              nullable: false,
              default: null,
              key: 'UNI',
              extra: '',
              sensitivity: 'personal',
            },
            {
              column: 'password',
              type: 'varchar(191)',
              nullable: false,
              default: null,
              key: '',
              extra: '',
              sensitivity: 'secret',
            },
          ],
          indexes: [],
          foreignKeys: [],
        },
      ],
      views: [],
      triggers: [],
      routines: [],
    }
    const notes = schemaMarkdown(report, 'Test')
    expect(notes).toContain('| `users` | 5 | 2 |')
    expect(notes).toContain('| `password` | `varchar(191)` | no |  | **secret** |')
  })
})

describe('extraction', () => {
  it('carries each column type into JSON without loss', () => {
    expect(columnExpression('price', 'decimal(10,2)')).toBe('CAST(`price` AS CHAR)')
    expect(columnExpression('sold_at', 'datetime')).toBe('CAST(`sold_at` AS CHAR)')
    expect(columnExpression('scan', 'longblob')).toBe('TO_BASE64(`scan`)')
    expect(columnExpression('id', 'bigint(20) unsigned')).toBe('CAST(`id` AS CHAR)')
    expect(columnExpression('title', 'varchar(255)')).toBe('`title`')
    expect(columnExpression('condition', 'varchar(191)')).toBe('`condition`') // a reserved word, quoted
  })

  it('leaves secret columns out of a table dump', () => {
    const sql = tableDumpSql({
      table: 'users',
      engine: null,
      collation: null,
      rows: 1,
      columns: [
        {
          column: 'id',
          type: 'int(10) unsigned',
          nullable: false,
          default: null,
          key: 'PRI',
          extra: '',
          sensitivity: null,
        },
        {
          column: 'password',
          type: 'varchar(191)',
          nullable: false,
          default: null,
          key: '',
          extra: '',
          sensitivity: 'secret',
        },
      ],
      indexes: [],
      foreignKeys: [],
    })
    expect(sql).toBe("SELECT JSON_OBJECT('id', `id`) FROM `users`;\n")
  })

  it('refuses an extract with a line that is not JSON', () => {
    const dir = mkdtempSync(join(tmpdir(), 'extract-'))
    const good = join(dir, 'good.jsonl')
    writeFileSync(good, '{"a":1}\n{"b":"x\\ny"}\n')
    expect(verifyJsonLines(good)).toBe(2)
    const bad = join(dir, 'bad.jsonl')
    writeFileSync(bad, '{"a":1}\nnot json\n')
    expect(() => verifyJsonLines(bad)).toThrow(/line 2/)
  })
})
