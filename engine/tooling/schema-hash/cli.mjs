#!/usr/bin/env node
// `pnpm schema-hash [database...] | --all` — TASKS.md 2.2.c.
import { compareSchemas, hashDatabase } from './schema-hash.mjs'

const args = process.argv.slice(2)
const all = args.includes('--all')
const databases = args.filter((arg) => !arg.startsWith('-'))

if (!all) {
  if (databases.length !== 1) {
    console.error('usage: schema-hash <database> | schema-hash --all [database...]')
    process.exit(2)
  }
  try {
    const { hash } = hashDatabase(databases[0])
    console.log(hash)
    process.exit(0)
  } catch (error) {
    console.error(`schema-hash: ${error.message}`)
    process.exit(1)
  }
}

try {
  const { hashes, allEqual, nothingToCompare } = compareSchemas(databases)
  for (const { database, hash } of hashes) {
    console.log(`${database}  ${hash}`)
  }
  if (nothingToCompare) {
    console.log(`schema-hash --all: nothing to check yet: fewer than two databases exist`)
    process.exit(0)
  }
  if (allEqual) {
    console.log(`schema-hash --all: ok, ${hashes.length} database(s) share one schema`)
    process.exit(0)
  }
  console.error(`schema-hash --all: schema drift across ${hashes.length} database(s)`)
  process.exit(1)
} catch (error) {
  console.error(`schema-hash: ${error.message}`)
  process.exit(1)
}
