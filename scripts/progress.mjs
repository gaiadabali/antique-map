#!/usr/bin/env node
// Syncs TASKS.md with its checkboxes: ticks what you name, closes every task whose
// subtasks are all ticked (`- [x] … — ✅ <today> <HEAD sha>`), drops a closed task's
// **Now** rows, and rebuilds the progress table between the progress markers.
//
// It runs by itself — the git pre-commit hook (.githooks/pre-commit) on every commit
// that includes TASKS.md, and the Claude Code hook (.claude/settings.json) after every
// edit to it — so the board never lags its boxes. By hand:
//
//   node scripts/progress.mjs                    sync in place        (pnpm tasks:sync)
//   node scripts/progress.mjs --tick 7.2.a 7.2.b tick, then sync      (pnpm tasks:tick …)
//   node scripts/progress.mjs --sha 1a2b3c4      close with this sha instead of HEAD's
//   node scripts/progress.mjs --check            exit 1 if a sync would change anything
//   node scripts/progress.mjs --print            print the table, change nothing
//
// Writes only the main checkout's TASKS.md; --check and --print read any copy.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { ROOT, computeBoard, runSync, today } from './board/run.mjs'

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const shaAt = args.indexOf('--sha')
const sha = shaAt === -1 ? undefined : args[shaAt + 1]
const tickAt = args.indexOf('--tick')
const tick = []
for (let i = tickAt + 1; tickAt !== -1 && i < args.length && !args[i].startsWith('--'); i++) {
  tick.push(args[i])
}
const quiet = flag('--quiet')

function fail(message) {
  console.error(`progress.mjs: ${message}`)
  process.exit(1)
}

if (flag('--print')) {
  const text = readFileSync(join(ROOT, 'TASKS.md'), 'utf8')
  const { next } = computeBoard(text, { date: today(), sha: sha ?? '0000000' })
  const start = next.indexOf('<!-- progress:start -->')
  const end = next.indexOf('<!-- progress:end -->')
  console.log(next.slice(start + '<!-- progress:start -->'.length, end).trim())
  process.exit(0)
}

let result
try {
  result = runSync({ tick, sha, write: !flag('--check') })
} catch (error) {
  fail(error.message)
}
if (result.unknown.length > 0) fail(`no such subtask: ${result.unknown.join(', ')}`)

if (flag('--check')) {
  if (!result.changed) process.exit(0)
  const why = result.closed.length
    ? `task(s) ${result.closed.join(', ')} have every subtask ticked but are not closed`
    : 'the progress table or the Now rows are stale'
  fail(`TASKS.md is out of sync — ${why}. Run \`pnpm tasks:sync\` in the main checkout.`)
}

if (!quiet || result.changed) {
  const { total } = result
  const notes = [
    result.ticked.length ? `ticked ${result.ticked.join(', ')}` : '',
    result.already.length ? `already ticked ${result.already.join(', ')}` : '',
    result.closed.length ? `closed ${result.closed.join(', ')}` : '',
  ].filter(Boolean)
  console.log(
    `progress: ${total.subsDone}/${total.subs} subtasks, ${total.tasksDone}/${total.tasks} tasks, ` +
      `${total.owner} owner items open${notes.length ? ` — ${notes.join('; ')}` : ''}`,
  )
}
