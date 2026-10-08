/**
 * Source scanning for the static checks (`../static.test.ts`): the repo's files without the test
 * files, and the Local API calls in them. Plain `node:fs`, no parser dependency — a balanced-brace
 * reader is enough to pull out the object a Local API call is given.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', '.git', '.claude', 'coverage', 'out'])

export type SourceFile = { path: string; text: string }

/** Every file under `dir` (repo-relative) whose name passes `keep`, skipping build output. */
export function walk(dir: string, keep: (file: string) => boolean): SourceFile[] {
  const found: SourceFile[] = []
  const visit = (absolute: string) => {
    for (const name of readdirSync(absolute)) {
      if (SKIP_DIRS.has(name)) continue
      const full = path.join(absolute, name)
      if (statSync(full).isDirectory()) visit(full)
      else if (keep(full)) {
        found.push({
          path: path.relative(ROOT, full).split(path.sep).join('/'),
          text: readFileSync(full, 'utf8'),
        })
      }
    }
  }
  visit(path.join(ROOT, dir))
  return found
}

const TEST_FILE = /(\.test\.|\.test-support\.|\.spec\.|\/test\/|\/tests\/|\.d\.ts$|payload-types\.ts$)/
const CODE = /\.(ts|tsx|js|jsx|mjs)$/

/** The engine's own code: no tests, no generated types, no migrations' SQL snapshots. */
export const engineSource = (): SourceFile[] =>
  walk('engine', (file) => {
    const rel = file.split(path.sep).join('/')
    return CODE.test(rel) && !TEST_FILE.test(rel) && !rel.includes('/migrations/')
  })

/** The object literal that starts at `text[open]` (a `{`), by balanced braces; strings are skipped. */
function objectAt(text: string, open: number): string {
  let depth = 0
  for (let i = open; i < text.length; i += 1) {
    const char = text[i]!
    if (char === "'" || char === '"' || char === '`') {
      const quote = char
      i += 1
      while (i < text.length && text[i] !== quote) i += text[i] === '\\' ? 2 : 1
    } else if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return text.slice(open, i + 1)
    }
  }
  return text.slice(open)
}

const LOCAL_API = /\b(?:payload|req\.payload|api)\.(find|findByID|create|update|delete|count|findGlobal|updateGlobal)\(\s*\{/g

export type LocalApiCall = {
  path: string
  line: number
  method: string
  /** `true`, `false`, or `undefined` when the call says nothing (Payload then defaults to true). */
  overrideAccess: 'true' | 'false' | 'variable' | 'spread' | undefined
  hasUser: boolean
}

/** Every Local API call in `files` whose first argument is an object literal. */
export function localApiCalls(files: SourceFile[]): LocalApiCall[] {
  const calls: LocalApiCall[] = []
  for (const file of files) {
    for (const match of file.text.matchAll(LOCAL_API)) {
      // A call quoted in a comment is documentation, not code.
      const lineStart = file.text.lastIndexOf('\n', match.index!) + 1
      if (/^\s*(\*|\/\/|\/\*)/.test(file.text.slice(lineStart, match.index))) continue
      const open = match.index! + match[0].length - 1
      const body = objectAt(file.text, open)
      const override = /\boverrideAccess\s*(?::\s*([^,}\n]+))?/.exec(body)
      calls.push({
        path: file.path,
        line: file.text.slice(0, match.index).split('\n').length,
        method: match[1]!,
        overrideAccess:
          override === null
            ? /\.\.\.\w+/.test(body)
              ? 'spread' // the flag may ride in a shared options object the scan cannot see
              : undefined
            : override[1] === undefined
              ? 'variable'
              : override[1].trim() === 'true'
                ? 'true'
                : override[1].trim() === 'false'
                  ? 'false'
                  : 'variable',
        hasUser: /\buser\b/.test(body),
      })
    }
  }
  return calls
}
