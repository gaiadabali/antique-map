// 2.2.c — normalised `pg_dump --schema-only` → sha256 per database; `--all`
// compares every brand database, so a hand-edited DDL on one brand (never
// allowed — BRANDS.md §6) fails CI instead of surfacing as a KOI-class defect
// months later.
import { createHash } from 'node:crypto'

import { dumpSchema, listAllDatabases } from './dump.mjs'

/**
 * Strips what `pg_dump` varies run to run without the schema itself
 * changing: the header/footer comments (dump timestamp, `pg_dump` version,
 * connection settings echoed as comments) and blank-line noise. Everything
 * that is actual DDL survives untouched, in the order `pg_dump` emits it —
 * which is already deterministic for one schema.
 */
export function normalizeSchema(raw) {
  return (
    raw
      .split('\n')
      .filter((line) => !line.startsWith('--'))
      // pg_dump 18 also wraps the dump in `\restrict <random-token>` /
      // `\unrestrict <random-token>` psql meta-commands (not `--` comments) —
      // a fresh random token every run, on schema that has not changed at all.
      .filter((line) => !/^\\(un)?restrict\b/.test(line))
      .map((line) => line.trimEnd())
      .join('\n')
      .replace(/\n{2,}/g, '\n')
      .trim()
  )
}

export function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

/** `{ database, hash }` for one database's normalised schema. */
export function hashDatabase(database, opts) {
  return { database, hash: sha256(normalizeSchema(dumpSchema(database, opts))) }
}

/**
 * Hashes every database in `databases` (or, if omitted, every database the
 * stack currently has) and reports whether they all match. Fewer than two
 * databases is not a failure — there is nothing yet to compare.
 */
export function compareSchemas(databases, opts) {
  const targets = databases && databases.length > 0 ? databases : listAllDatabases(opts)
  if (targets.length < 2) {
    return {
      hashes: targets.map((database) => hashDatabase(database, opts)),
      allEqual: true,
      nothingToCompare: true,
    }
  }
  const hashes = targets.map((database) => hashDatabase(database, opts))
  const distinct = new Set(hashes.map((h) => h.hash))
  return { hashes, allEqual: distinct.size <= 1, nothingToCompare: false }
}
