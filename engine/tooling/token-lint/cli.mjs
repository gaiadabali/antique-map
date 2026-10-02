#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Token-only lint for the web app.
 *
 * Scans CSS/TS/TSX under engine/apps/web/src outside the token directories
 * and fails on raw colour literals and font-family declarations, as required
 * by DESIGN-SYSTEM.md §Built to be restyled and ticket 4.1.d.
 */

const root = resolve(fileURLToPath(import.meta.url), '../../../..')
const defaultTarget = resolve(root, 'engine/apps/web/src')
const tokenDirs = [
  resolve(root, 'engine/apps/web/src/shared/styles/tokens'),
  resolve(root, 'engine/apps/web/src/sites/gallery/tokens'),
  resolve(root, 'engine/apps/web/src/sites/shop/tokens'),
]

const hexPattern = /#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g
const cssColourFunctionPattern = /\b(rgba?|hsla?)\(/gi
const fontFamilyPattern = /\bfont-family\s*:/gi
const fontFamilyObjectPattern = /\bfontFamily\b/g

const extensions = new Set(['.css', '.ts', '.tsx'])

function isUnderTokenDir(filePath) {
  const normalized = filePath.replace(/\\/g, '/')
  return (
    tokenDirs.some((dir) => {
      const d = dir.replace(/\\/g, '/')
      return normalized.startsWith(d + '/') || normalized === d
    }) || /\/(shared\/styles\/tokens|sites\/gallery\/tokens|sites\/shop\/tokens)\//.test(normalized)
  )
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(path)
    } else if (entry.isFile() && extensions.has(entry.name.slice(entry.name.lastIndexOf('.')))) {
      yield path
    }
  }
}

function findViolations(source, filePath) {
  const lines = source.split('\n')
  const ext = filePath.slice(filePath.lastIndexOf('.'))
  const isCss = ext === '.css'
  const out = []
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const lineNumber = i + 1
    for (const match of line.matchAll(hexPattern)) {
      out.push({ line: lineNumber, col: match.index + 1, kind: 'hex colour', snippet: match[0] })
    }
    for (const match of line.matchAll(cssColourFunctionPattern)) {
      out.push({
        line: lineNumber,
        col: match.index + 1,
        kind: 'colour function',
        snippet: match[0],
      })
    }
    for (const match of line.matchAll(isCss ? fontFamilyPattern : fontFamilyObjectPattern)) {
      out.push({
        line: lineNumber,
        col: match.index + 1,
        kind: isCss ? 'font-family declaration' : 'fontFamily literal',
        snippet: match[0],
      })
    }
  }
  return out
}

export function run(target = defaultTarget) {
  const targetPath = resolve(target)
  const files = [...walk(targetPath)].filter((filePath) => !isUnderTokenDir(filePath))
  const violations = []
  for (const filePath of files) {
    const source = readFileSync(filePath, 'utf8')
    const fileViolations = findViolations(source, filePath)
    for (const v of fileViolations) {
      violations.push({ ...v, file: relative(root, filePath) })
    }
  }
  return violations
}

function main() {
  const target = process.argv[2] ? resolve(process.argv[2]) : defaultTarget
  if (!statSync(target, { throwIfNoEntry: false })?.isDirectory()) {
    console.error(`Target is not a directory: ${target}`)
    process.exit(1)
  }
  const violations = run(target)
  if (violations.length === 0) {
    console.log(`No raw colours or font-family declarations found outside token files.`)
    process.exit(0)
  }
  for (const v of violations) {
    console.log(`${v.file}:${v.line}:${v.col}\t${v.kind}\t${v.snippet}`)
  }
  process.exit(1)
}

const entryPath = fileURLToPath(import.meta.url)
if (entryPath === process.argv[1]) {
  main()
}
