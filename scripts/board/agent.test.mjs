// The agent-side board commands: `tasks:start` and `tasks:report` (scripts/board/agent.mjs).
import { describe, expect, it } from 'vitest'

import { guardReport, startTask } from './agent.mjs'

const BOARD = `# Board

## Now

| Wave | Task | Agent | Worktree / branch | Since | Note |
| ---- | ---- | ----- | ----------------- | ----- | ---- |
| 1·W1 | 1.1 Existing | devops | agent worktree | 2026-10-01 | |

## Phase 1 — Demo · Foundation · needs — · ~1d

**Goal:** demo.
**Waves:** W1 — 1.1, 1.2

- [ ] **1.1 Existing** · needs: — — 🔄 1·W1
  - **Lane** OPS · **Agent** devops · **Wave** W1
  - **Owns** \`a/**\`
  - [ ] 1.1.a one
  - [ ] 1.1.b **Check:** done

- [ ] **1.2 👤 A new task** · needs: —
  - **Lane** OPS · **Agent** devops · **Wave** W1
  - **Owns** \`b/**\`
  - [ ] 1.2.a one
  - [ ] 1.2.b **Check:** done
`

describe('guardReport', () => {
  it('refuses a Check and an unknown id, and lets a plain subtask through', () => {
    expect(guardReport(BOARD, ['1.2.a', '1.2.b', '9.9.z'])).toEqual({
      checks: ['1.2.b'],
      unknown: ['9.9.z'],
    })
  })
})

describe('startTask', () => {
  it('marks the task in flight and adds its Now row after the existing ones', () => {
    const r = startTask(BOARD, '1.2', { agent: 'senior-fe', branch: 'feat/x', date: '2026-10-02' })
    expect(r.status).toBe('started')
    expect(r.text).toContain('- [ ] **1.2 👤 A new task** · needs: — — 🔄 1·W1')
    const rows = r.text.split('\n').filter((l) => l.startsWith('| 1·W1'))
    expect(rows).toHaveLength(2)
    expect(rows[1]).toBe('| 1·W1 | 1.2 A new task | senior-fe | `feat/x` | 2026-10-02 | |')
  })

  it('leaves a task that is already in flight, and reports an unknown one', () => {
    expect(startTask(BOARD, '1.1', { date: '2026-10-02' }).status).toBe('already')
    expect(startTask(BOARD, '7.7', { date: '2026-10-02' }).status).toBe('unknown')
  })
})

describe('commitBoard', () => {
  it('commits only TASKS.md, leaves other staged files alone, and reports a clean board', async () => {
    const { execFileSync } = await import('node:child_process')
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const { commitBoard } = await import('./agent.mjs')
    const repo = mkdtempSync(join(tmpdir(), 'commit-board-'))
    const git = (...a) => execFileSync('git', a, { cwd: repo }).toString()
    try {
      git('init', '-q')
      git('config', 'user.email', 't@example.com')
      git('config', 'user.name', 't')
      git('config', 'commit.gpgsign', 'false')
      writeFileSync(join(repo, 'TASKS.md'), 'one\n')
      writeFileSync(join(repo, 'other.txt'), 'x\n')
      git('add', '.')
      git('commit', '-q', '-m', 'init')
      expect(commitBoard(repo, 'nothing')).toBe('clean')
      writeFileSync(join(repo, 'TASKS.md'), 'two\n')
      writeFileSync(join(repo, 'other.txt'), 'changed\n')
      git('add', 'other.txt')
      expect(commitBoard(repo, 'docs(board): tick')).toBe('committed')
      expect(git('show', '--name-only', '--format=%s', 'HEAD').trim()).toBe(
        'docs(board): tick\n\nTASKS.md',
      )
      expect(git('diff', '--cached', '--name-only').trim()).toBe('other.txt')
    } finally {
      rmSync(repo, { recursive: true, force: true })
    }
  })
})
