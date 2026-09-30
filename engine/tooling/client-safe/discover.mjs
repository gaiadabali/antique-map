// Finds the modules the gate starts from: every file under `engine/` whose directive prologue
// holds `'use client'` — the first statement, or one of the string directives before any code
// (React reads the prologue; comments may come first). A client boundary is where a server tree
// hands a module to the browser, so what it reaches is what the page ships.
import { readdirSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'

/** Folders that hold no hand-written module: dependencies and build or test output. */
const SKIPPED_FOLDERS = new Set([
  'node_modules',
  '.next',
  'dist',
  'coverage',
  '.turbo',
  'test-results',
  'playwright-report',
])
const MODULE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'])

/** Skips whitespace and comments from `at`; returns the index of the next token. */
function skipTrivia(source, at) {
  let i = at
  for (;;) {
    while (i < source.length && /\s/.test(source[i] ?? '')) i += 1
    if (source.startsWith('//', i)) {
      const end = source.indexOf('\n', i)
      i = end === -1 ? source.length : end + 1
    } else if (source.startsWith('/*', i)) {
      const end = source.indexOf('*/', i + 2)
      i = end === -1 ? source.length : end + 2
    } else return i
  }
}

/** Whether a module's directive prologue holds `'use client'` (either quote). */
export function isClientModule(text) {
  const source = text.startsWith('﻿') ? text.slice(1) : text
  let i = skipTrivia(source, 0)
  for (;;) {
    const quote = source[i]
    if (quote !== "'" && quote !== '"') return false
    let end = i + 1
    while (end < source.length && source[end] !== quote && source[end] !== '\n')
      end += source[end] === '\\' ? 2 : 1
    if (source[end] !== quote) return false
    const value = source.slice(i + 1, end)
    // A directive is a string standing alone: `'use client'.trim()` is an expression, not one.
    let after = end + 1
    while (after < source.length && /[ \t]/.test(source[after] ?? '')) after += 1
    const next = source[after]
    if (next !== undefined && next !== ';' && next !== '\n' && next !== '\r' && next !== '/')
      return false
    if (value === 'use client') return true
    i = skipTrivia(source, next === ';' ? after + 1 : after)
  }
}

/** Every module file under `root`, recursively, outside dependency and build folders. */
function modulesUnder(root) {
  let entries
  try {
    entries = readdirSync(root, { withFileTypes: true })
  } catch {
    return [] // a root that does not exist yet (no apps on this branch) holds no module
  }
  return entries.flatMap((entry) => {
    const path = join(root, entry.name)
    if (entry.isDirectory()) return SKIPPED_FOLDERS.has(entry.name) ? [] : modulesUnder(path)
    const isModule = MODULE_EXTENSIONS.has(extname(entry.name)) && !/\.d\.[mc]?ts$/.test(entry.name)
    return entry.isFile() && isModule ? [path] : []
  })
}

/** Every `'use client'` module under `root`, sorted, as absolute paths. */
export function findClientModules(root) {
  return modulesUnder(root)
    .filter((file) => isClientModule(readFileSync(file, 'utf8')))
    .sort()
}
