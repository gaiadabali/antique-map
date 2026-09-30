// `pnpm check:client-safe` (TASKS.md 4.2.a): every `'use client'` module under `engine/` is
// walked as a browser bundler would walk it, and any reach of the schema library, a server
// entry of `@engine/config`, a Node built-in (`node:*` or bare, 4.7.a) or Payload fails the gate
// with its import chain — as does a dynamic `import()` of an expression, which it cannot follow.
import { join, relative, sep } from 'node:path'

import { findClientModules } from './discover.mjs'
import { forbiddenReason } from './rules.mjs'
import { findReaches } from './walk.mjs'

/** Walks every client module under `<repoRoot>/engine`; returns what each one reaches. */
export function checkClientSafe(repoRoot) {
  const modules = findClientModules(join(repoRoot, 'engine'))
  const violations = modules.flatMap((entry) =>
    findReaches(entry, forbiddenReason).map((reach) => ({ entry, ...reach })),
  )
  return { modules, violations }
}

const shown = (repoRoot, file) => {
  const path = relative(repoRoot, file)
  return (path.startsWith('..') ? file : path).split(sep).join('/')
}

/** One violation as the lines a person reads: what was reached, then the chain to it. */
export function formatViolation(repoRoot, { entry, chain, specifier, reason, error, expression }) {
  const head = reason
    ? `${shown(repoRoot, entry)} reaches ${specifier} — ${reason}`
    : expression !== undefined
      ? `${shown(repoRoot, entry)} reaches import(${expression}) in ${shown(repoRoot, chain.at(-1).file)}, which the walk cannot follow: ${error}`
      : `${shown(repoRoot, entry)} imports ${specifier}, which the walk cannot follow: ${error}`
  const steps = chain.map(({ specifier: each, kind, expression: code }, index) => {
    const into = chain[index + 1]?.file
    const how =
      code !== undefined ? `import(${code})` : kind === 'dynamic' ? `import('${each}')` : each
    return `    → ${how}${into ? ` (${shown(repoRoot, into)})` : ''}`
  })
  return [head, `    ${shown(repoRoot, entry)}`, ...steps].join('\n')
}
