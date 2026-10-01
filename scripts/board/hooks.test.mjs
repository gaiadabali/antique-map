// End to end: a throwaway git repository with the real hook files in it, so the
// pre-commit hook, the Claude Code hook and `--check` are proven the way they run.
import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { board } from './fixture.mjs'
import { ROOT } from './run.mjs'

const FILES = [
  '.githooks/pre-commit',
  '.githooks/post-commit',
  'scripts/progress.mjs',
  'scripts/board/run.mjs',
  'scripts/board/sync.mjs',
  'scripts/board/table.mjs',
  'scripts/board/claude-hook.mjs',
  'engine/tooling/tasks-lint/parse.mjs',
  'engine/tooling/tasks-lint/status.mjs',
]
const FINISHED = { boxes: { '7.1.a': 'x', '7.1.b': 'x' }, suffix: { 7.1: ' — 🔄 7·W1' } }

let repo
const git = (...args) => execFileSync('git', args, { cwd: repo }).toString().trim()
const read = (path = 'TASKS.md') => readFileSync(join(repo, path), 'utf8')
const node = (args, opts = {}) =>
  spawnSync(process.execPath, args, { cwd: repo, encoding: 'utf8', ...opts })

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'board-'))
  for (const file of FILES) cpSync(join(ROOT, file), join(repo, file))
  git('init', '-q', '-b', 'main')
  git('config', 'user.email', 'board@example.invalid')
  git('config', 'user.name', 'board test')
  git('config', 'core.autocrlf', 'false')
  writeFileSync(join(repo, 'TASKS.md'), board())
  git('add', '.')
  git('commit', '-q', '-m', 'seed')
  git('config', 'core.hooksPath', '.githooks')
})
afterEach(() => rmSync(repo, { recursive: true, force: true }))

describe('the git pre-commit hook', () => {
  it('closes a finished task in the commit itself, and leaves the tree clean', () => {
    const parent = git('rev-parse', '--short', 'HEAD')
    writeFileSync(join(repo, 'TASKS.md'), board(FINISHED))
    git('add', 'TASKS.md')
    git('commit', '-q', '-m', 'tick 7.1.b')
    const committed = git('show', 'HEAD:TASKS.md')
    expect(committed).toContain(`- [x] **7.1 First task** · needs: — — ✅ `)
    expect(committed).toContain(` ${parent}`)
    expect(committed).not.toContain('| 7·W1 | 7.1 First task')
    expect(committed).not.toContain('stale')
    expect(git('status', '--porcelain')).toBe('')
  }, 60_000)

  it('works for `git commit TASKS.md -m …` too, without sweeping in other changes', () => {
    writeFileSync(join(repo, 'TASKS.md'), board(FINISHED))
    writeFileSync(join(repo, 'other.txt'), 'not for this commit')
    git('commit', '-q', 'TASKS.md', '-m', 'tick by path')
    expect(git('show', 'HEAD:TASKS.md')).toContain('— ✅ ')
    expect(git('show', '--name-only', '--format=', 'HEAD')).toBe('TASKS.md')
    expect(git('status', '--porcelain')).toBe('?? other.txt')
  }, 60_000)

  it('stays out of a commit that does not include TASKS.md', () => {
    writeFileSync(join(repo, 'TASKS.md'), board(FINISHED))
    writeFileSync(join(repo, 'other.txt'), 'x')
    git('add', 'other.txt')
    git('commit', '-q', '-m', 'unrelated')
    expect(read()).toBe(board(FINISHED))
  }, 60_000)

  it('leaves an agent worktree’s copy of the board alone', () => {
    const wt = join(repo, '..', `${repo.split(/[\\/]/).pop()}-wt`)
    git('worktree', 'add', '-q', wt, '-b', 'feat/x')
    try {
      writeFileSync(join(wt, 'TASKS.md'), board(FINISHED))
      execFileSync('git', ['commit', '-q', '-am', 'copy'], { cwd: wt })
      expect(readFileSync(join(wt, 'TASKS.md'), 'utf8')).toBe(board(FINISHED))
    } finally {
      git('worktree', 'remove', '--force', wt)
    }
  }, 60_000)
})

describe('the Claude Code hook', () => {
  const hook = (input) => node(['scripts/board/claude-hook.mjs'], { input: JSON.stringify(input) })

  it('syncs after an Edit of TASKS.md and tells the user what closed', () => {
    writeFileSync(join(repo, 'TASKS.md'), board(FINISHED))
    const r = hook({ tool_name: 'Edit', tool_input: { file_path: join(repo, 'TASKS.md') } })
    expect(r.status).toBe(0)
    expect(JSON.parse(r.stdout).systemMessage).toMatch(/^board synced: closed 7\.1; /)
    expect(read()).toContain('- [x] **7.1 First task**')
  }, 60_000)

  it('syncs after a Bash command that names TASKS.md', () => {
    writeFileSync(join(repo, 'TASKS.md'), board(FINISHED))
    const r = hook({ tool_name: 'Bash', tool_input: { command: "sed -i 's/x/y/' TASKS.md" } })
    expect(r.status).toBe(0)
    expect(read()).toContain('— ✅ ')
  }, 60_000)

  it('does nothing for any other file, and says nothing', () => {
    writeFileSync(join(repo, 'TASKS.md'), board(FINISHED))
    const r = hook({ tool_name: 'Write', tool_input: { file_path: join(repo, 'README.md') } })
    expect(r.stdout).toBe('')
    expect(read()).toBe(board(FINISHED))
  }, 60_000)
})

describe('progress.mjs', () => {
  it('--check fails on a stale board and passes once synced', () => {
    writeFileSync(join(repo, 'TASKS.md'), board(FINISHED))
    const stale = node(['scripts/progress.mjs', '--check'])
    expect(stale.status).toBe(1)
    expect(stale.stderr).toMatch(/7\.1 have every subtask ticked but are not closed/)
    expect(node(['scripts/progress.mjs']).status).toBe(0)
    expect(node(['scripts/progress.mjs', '--check']).status).toBe(0)
  }, 60_000)

  it('--tick ticks, closes and refuses an unknown id without writing', () => {
    expect(node(['scripts/progress.mjs', '--tick', '7.1.a', '7.9.z']).status).toBe(1)
    expect(read()).toBe(board())
    const r = node(['scripts/progress.mjs', '--tick', '7.1.a', '7.1.b', '--sha', 'deadbee'])
    expect(r.status).toBe(0)
    expect(r.stdout).toMatch(/ticked 7\.1\.a, 7\.1\.b; closed 7\.1/)
    expect(read()).toContain('— ✅ ')
    expect(read()).toContain(' deadbee')
  }, 60_000)
})
