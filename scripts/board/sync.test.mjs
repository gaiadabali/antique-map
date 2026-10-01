import { describe, expect, it } from 'vitest'

import { allTasks, parseTasksMd } from '../../engine/tooling/tasks-lint/parse.mjs'
import { ALL_RULES } from '../../engine/tooling/tasks-lint/rules.mjs'
import { board } from './fixture.mjs'
import { computeBoard } from './run.mjs'
import { closeFinishedTasks, dropNowRows, syncTasks, tickSubtasks } from './sync.mjs'
import { buildTable, countPhases } from './table.mjs'

const AT = { date: '2026-10-01', sha: 'abc1234' }
const lintStatus = (text) => {
  const model = parseTasksMd(text)
  return ALL_RULES.flatMap((rule) => rule(model, allTasks(model))).filter(
    (f) => f.rule === 'task-status',
  )
}
const lineOf = (text, id) => text.split('\n').find((l) => l.includes(`**${id} `))

describe('tickSubtasks()', () => {
  it('ticks the named subtasks and reports the rest', () => {
    const r = tickSubtasks(board({ boxes: { '7.1.b': 'x' } }), ['7.1.a', '7.1.b', '7.9.z'])
    expect(r.ticked).toEqual(['7.1.a'])
    expect(r.already).toEqual(['7.1.b'])
    expect(r.unknown).toEqual(['7.9.z'])
    expect(r.text).toContain('  - [x] 7.1.a do the thing')
  })

  it('never touches a task line or the log', () => {
    const r = tickSubtasks(board(), ['7.1', '9.9'])
    expect(r.unknown).toEqual(['7.1', '9.9'])
    expect(r.text).toBe(board())
  })
})

describe('closeFinishedTasks()', () => {
  it('closes a task once its last subtask is ticked, replacing 🔄 with ✅', () => {
    const doc = board({ boxes: { '7.1.a': 'x', '7.1.b': 'x' }, suffix: { 7.1: ' — 🔄 7·W1' } })
    const r = closeFinishedTasks(doc, AT)
    expect(r.closed).toEqual(['7.1'])
    expect(lineOf(r.text, '7.1')).toBe(
      '- [x] **7.1 First task** · needs: — — ✅ 2026-10-01 abc1234',
    )
    expect(lintStatus(r.text)).toEqual([])
  })

  it('drops a ⛔ too: an owner item ticked is no longer blocking', () => {
    const doc = board({
      boxes: { '7.10.a': 'x', '7.10.b': 'x' },
      suffix: { '7.10': ' — 🔄 7·W1 — ⛔ 👤 OA9' },
    })
    expect(lineOf(closeFinishedTasks(doc, AT).text, '7.10')).toBe(
      '- [x] **7.10 Tenth task** · needs: — — ✅ 2026-10-01 abc1234',
    )
  })

  it('leaves a task with an open subtask, a cut task and a closed task alone', () => {
    const doc = board({
      boxes: { '7.1.a': 'x', '7.2.a': 'x', 7.3: 'x', '7.3.a': 'x' },
      suffix: { 7.3: ' — ✅ 2026-09-30 1111111' },
    })
    expect(closeFinishedTasks(doc, AT)).toEqual({ text: doc, closed: [] })
  })

  it('refuses a malformed date or sha rather than write one', () => {
    expect(() => closeFinishedTasks(board(), { date: '1 Oct', sha: 'abc1234' })).toThrow()
    expect(() => closeFinishedTasks(board(), { date: '2026-10-01', sha: 'HEAD' })).toThrow()
  })
})

describe('dropNowRows()', () => {
  it('drops the closed task’s rows from **Now** only — 7.1, not 7.10', () => {
    const text = dropNowRows(board(), ['7.1'])
    expect(text).not.toContain('| 7·W1 | 7.1 First task')
    expect(text).toContain('| 7·W1 | 7.10 Tenth task')
    expect(text).toContain('**7.1 First task**')
  })
})

describe('syncTasks()', () => {
  it('ticks the last subtask, closes the task and clears its Now row in one go', () => {
    const doc = board({ boxes: { '7.1.a': 'x' }, suffix: { 7.1: ' — 🔄 7·W1' } })
    const r = syncTasks(doc, { ...AT, tick: ['7.1.b'] })
    expect(r.ticked).toEqual(['7.1.b'])
    expect(r.closed).toEqual(['7.1'])
    expect(r.text).not.toContain('| 7.1 First task')
    expect(lintStatus(r.text)).toEqual([])
  })

  it('changes nothing when an id is unknown', () => {
    const r = syncTasks(board(), { ...AT, tick: ['7.1.a', '7.1.z'] })
    expect(r.text).toBe(board())
    expect(r.unknown).toEqual(['7.1.z'])
  })

  it('is idempotent', () => {
    const once = computeBoard(board({ boxes: { '7.1.a': 'x', '7.1.b': 'x' } }), AT).next
    expect(computeBoard(once, { date: '2026-12-31', sha: 'fffffff' }).next).toBe(once)
  })
})

describe('the progress table', () => {
  it('counts tasks and subtasks, skipping a cut task and the log', () => {
    const [phase] = countPhases(board({ boxes: { '7.1.a': 'x', '7.10.a': 'x' } }))
    expect(phase).toMatchObject({ id: '7', tasks: 3, subs: 5, subsDone: 2, owner: 0 })
    expect(countPhases(board())[0].owner).toBe(1)
  })

  it('skips a cut subtask in the counts, and closes a task whose other subtasks are ticked', () => {
    const cutOwner = board({ boxes: { '7.10.b': 'x' } }).replace(
      '7.10.a 👤 the owner hands it over',
      '7.10.a 👤 the owner hands it over — ✂️ cut: not needed',
    )
    const phase = countPhases(cutOwner)[0]
    expect(phase).toMatchObject({ subs: 4, subsDone: 1, owner: 0 })
    const { closed } = closeFinishedTasks(cutOwner, AT)
    expect(closed).toContain('7.10')
  })

  it('is rebuilt between the markers, keeping CRLF files CRLF', () => {
    const crlf = board().replace(/\n/g, '\r\n')
    const { next } = computeBoard(crlf, AT)
    expect(next).not.toContain('stale')
    expect(next).toContain(buildTable(board()).table.split('\n').join('\r\n'))
    expect(next.replace(/\r\n/g, '')).not.toContain('\n')
  })
})
