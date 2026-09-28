// Reading and merging .env.local without clobbering anything: an existing key
// keeps its value unless the caller forces it, every other line (comments,
// secrets a person added by hand, blank lines) is kept byte for byte, and
// missing keys are appended. This module only ever writes the keys it is
// given (PORT, DB_SUFFIX), never a secret.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const KEY_LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/

function unquote(raw) {
  const match = /^(['"])(.*)\1$/.exec(raw)
  return match ? match[2] : raw
}

/** Parses dotenv text into a Map of key → value (last one wins, as dotenv loaders do). */
export function parseEnv(text) {
  const values = new Map()
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue
    const match = KEY_LINE.exec(line)
    if (match) values.set(match[1], unquote(match[2]))
  }
  return values
}

/** Reads an env file into a Map; a missing file is an empty Map. */
export function readEnvFile(path) {
  return existsSync(path) ? parseEnv(readFileSync(path, 'utf8')) : new Map()
}

/**
 * Merges `wanted` (key → value) into dotenv `text`. Returns the new text and
 * what happened to each key: 'added', 'unchanged', 'kept' (differs, not
 * forced) or 'overwritten' (differs, forced).
 */
export function mergeEnv(text, wanted, { force = false, header = [] } = {}) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const lines = text === '' ? [] : text.split(/\r?\n/)
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  const existing = parseEnv(text)
  const outcome = {}

  for (const [key, value] of Object.entries(wanted)) {
    if (!existing.has(key)) {
      outcome[key] = 'added'
    } else if (existing.get(key) === value) {
      outcome[key] = 'unchanged'
    } else if (!force) {
      outcome[key] = 'kept'
    } else {
      outcome[key] = 'overwritten'
      for (let i = 0; i < lines.length; i += 1) {
        const match = KEY_LINE.exec(lines[i])
        if (match && match[1] === key && !/^\s*#/.test(lines[i])) lines[i] = `${key}=${value}`
      }
    }
  }

  const added = Object.entries(wanted).filter(([key]) => outcome[key] === 'added')
  if (added.length > 0) {
    if (lines.length === 0) lines.push(...header)
    else if (lines[lines.length - 1].trim() !== '') lines.push('')
    for (const [key, value] of added) lines.push(`${key}=${value}`)
  }
  return { text: lines.length > 0 ? lines.join(eol) + eol : '', outcome }
}

/** Merges into the file at `path`, writing only when something changed. Returns the outcome map. */
export function writeEnvFile(path, wanted, options) {
  const before = existsSync(path) ? readFileSync(path, 'utf8') : ''
  const { text, outcome } = mergeEnv(before, wanted, options)
  if (text !== before) writeFileSync(path, text, 'utf8')
  return outcome
}
