#!/usr/bin/env node
// Claude Code PostToolUse hook (.claude/settings.json): after an Edit, Write or
// MultiEdit of TASKS.md — or a Bash command that names it — sync the board, so a
// ticked box closes its task and moves the progress table at once.
//
// Reads the hook's JSON on stdin. Never fails the tool call: a problem becomes a
// message to the user, and a worktree copy of TASKS.md is left alone.
import { readFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

import { ROOT, isWorktreeCopy, runSync } from './run.mjs'

function say(message, context) {
  const out = { systemMessage: message }
  if (context) {
    out.hookSpecificOutput = { hookEventName: 'PostToolUse', additionalContext: context }
  }
  process.stdout.write(JSON.stringify(out))
}

function touchesBoard(input) {
  const tool = input.tool_name
  const params = input.tool_input ?? {}
  if (tool === 'Bash' || tool === 'PowerShell') return /TASKS\.md/.test(params.command ?? '')
  const path = params.file_path ?? input.tool_response?.filePath
  if (!path || basename(path) !== 'TASKS.md') return false
  return resolve(path).toLowerCase() === resolve(join(ROOT, 'TASKS.md')).toLowerCase()
}

let input
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}')
} catch {
  process.exit(0)
}
if (!touchesBoard(input) || isWorktreeCopy()) process.exit(0)

try {
  const result = runSync()
  if (result.changed) {
    const closed = result.closed.length ? `closed ${result.closed.join(', ')}; ` : ''
    const { total } = result
    const line = `board synced: ${closed}${total.subsDone}/${total.subs} subtasks, ${total.tasksDone}/${total.tasks} tasks`
    say(
      line,
      `TASKS.md was re-synced by the board hook (${closed}table rebuilt). Re-read it before editing it again.`,
    )
  }
} catch (error) {
  say(`board sync failed: ${error.message}`)
}
