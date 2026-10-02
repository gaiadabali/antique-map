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
// From an agent's worktree (writes the MAIN checkout's board, under its lock; scripts/board/agent.mjs):
//   node scripts/progress.mjs --start 5.2 [--agent senior-fe]   mark the task 🔄 and add its Now row   (pnpm tasks:start)
//   node scripts/progress.mjs --report 5.2.a 5.2.b              tick finished subtasks, never a Check   (pnpm tasks:report)
//
// Writes only the main checkout's TASKS.md; --check and --print read any copy.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { execFileSync } from 'node:child_process'

import { guardReport, mainCheckoutRoot, startTask } from './board/agent.mjs'
import { ROOT, computeBoard, editBoard, runSync, today } from './board/run.mjs'

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const shaAt = args.indexOf('--sha')
const sha = shaAt === -1 ? undefined : args[shaAt + 1]
function listAfter(name) {
  const at = args.indexOf(name)
  const out = []
  for (let i = at + 1; at !== -1 && i < args.length && !args[i].startsWith('--'); i++)
    out.push(args[i])
  return out
}
const tick = listAfter('--tick')
const reported = listAfter('--report')
const started = listAfter('--start')
const agentAt = args.indexOf('--agent')
const agent = agentAt === -1 ? undefined : args[agentAt + 1]
const quiet = flag('--quiet')

function fail(message) {
  console.error(`progress.mjs: ${message}`)
  process.exit(1)
}

if (flag('--report') || flag('--start')) {
  const root = mainCheckoutRoot(ROOT)
  if (flag('--report')) {
    if (reported.length === 0) fail('--report needs subtask ids, e.g. --report 5.2.a 5.2.b')
    const text = readFileSync(join(root, 'TASKS.md'), 'utf8')
    const guard = guardReport(text, reported)
    if (guard.unknown.length) fail(`no such subtask: ${guard.unknown.join(', ')}`)
    if (guard.checks.length) {
      fail(
        `${guard.checks.join(', ')} is a Check: it passes on merged main after qa, so the orchestrator ticks it`,
      )
    }
    const done = runSync({ root, tick: reported })
    console.log(
      `progress: ${done.total.subsDone}/${done.total.subs} subtasks, ${done.total.tasksDone}/${done.total.tasks} tasks` +
        (done.ticked.length ? ` — ticked ${done.ticked.join(', ')}` : '') +
        (done.already.length ? `; already ticked ${done.already.join(', ')}` : ''),
    )
  } else {
    if (started.length !== 1) fail('--start needs one task id, e.g. --start 5.2')
    let branch = ''
    try {
      branch = execFileSync('git', ['branch', '--show-current'], {
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .toString()
        .trim()
    } catch {
      // a detached or non-git checkout: the Now row just says "agent worktree"
    }
    const res = editBoard(root, (text) =>
      startTask(text, started[0], { agent, branch, date: today() }),
    )
    if (res.status === 'unknown') fail(`no such open task (or it has no Wave line): ${started[0]}`)
    if (res.status === 'closed') fail(`${started[0]} is already closed`)
    console.log(
      res.status === 'already'
        ? `${started[0]} is already in flight`
        : `${started[0]} marked in flight on the board`,
    )
  }
  process.exit(0)
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
