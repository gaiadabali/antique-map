import { describe, expect, it } from 'vitest'

import { allTasks, parseTasksMd } from './parse.mjs'
import { ALL_RULES, checkPhaseLimits } from './rules.mjs'
import { splitStatusSuffix } from './status.mjs'
import { checkWaveReadiness } from './wave.mjs'

/** A two-phase board; `suffix` is appended to the named task line (3.3.d). */
function board(suffix = {}) {
  const line = (id, rest) => `${rest}${suffix[id] ?? ''}`
  return `## Phase 1 — Fixture · Foundation · needs — · ~1d

${line('1.1', '- [x] **1.1 First** · needs: —')}
  - **Lane** HAR · **Wave** W1
  - **Owns** \`fixture/a/**\`
  - [x] 1.1.a **Check:** ok

${line('1.2', '- [ ] **1.2 Second** · needs: 1.1')}
  - **Lane** HAR · **Wave** W2
  - **Owns** \`fixture/b/**\`
  - [ ] 1.2.a **Check:** ok

${line('1.3', '- [ ] **1.3 Third** · needs: 1.1 · 👤 a sandbox account')}
  - **Lane** HAR · **Wave** W2
  - **Owns** \`fixture/c/**\`
  - [ ] 1.3.a **Check:** ok

## Phase 2 — Later · Foundation · needs 1 · ~1d

${line('2.1', '- [ ] **2.1 Later** · needs: 1.2')}
  - **Lane** HAR · **Wave** W1
  - **Owns** \`fixture/d/**\`
  - [ ] 2.1.a **Check:** ok
`
}

const DONE = { 1.1: ' — ✅ 2026-09-30 ff71f66' }
const lint = (doc) => {
  const model = parseTasksMd(doc)
  return ALL_RULES.flatMap((rule) => rule(model, allTasks(model)))
}
const task = (doc, id) => allTasks(parseTasksMd(doc)).find((t) => t.id === id)

describe('splitStatusSuffix()', () => {
  it('parses each of the board’s suffixes after the needs list', () => {
    expect(splitStatusSuffix('— — ✅ 2026-09-30 ff71f66')).toEqual({
      needsRaw: '—',
      statuses: [
        { kind: 'done', raw: '✅ 2026-09-30 ff71f66', date: '2026-09-30', sha: 'ff71f66' },
      ],
    })
    expect(splitStatusSuffix('3.1 — 🔄 3·W2').statuses).toEqual([
      { kind: 'doing', raw: '🔄 3·W2', phase: 3, wave: 'W2' },
    ])
    expect(splitStatusSuffix('13.1 — ⛔ 👤 D14').statuses).toEqual([
      { kind: 'blocked', raw: '⛔ 👤 D14', reason: '👤 D14' },
    ])
    // ✂️ with and without its emoji selector (U+FE0F).
    for (const scissors of ['✂️', '✂']) {
      const { needsRaw, statuses } = splitStatusSuffix(`23.3 · 👤 x — ${scissors} cut: v2`)
      expect(needsRaw).toBe('23.3 · 👤 x')
      expect(statuses).toMatchObject([{ kind: 'cut', reason: 'v2' }])
    }
    expect(splitStatusSuffix('3.1 — 🔄 3·W2 — ⛔ 👤 D14').statuses.map((s) => s.kind)).toEqual([
      'doing',
      'blocked',
    ])
    expect(splitStatusSuffix('1.2.a–1.2.d, 17.1')).toEqual({
      needsRaw: '1.2.a–1.2.d, 17.1',
      statuses: [],
    })
  })
})

describe('a task line marked 🔄, ⛔ or ✂️ lints clean (3.3.c)', () => {
  it.each([
    ['🔄 N·Wk', { ...DONE, 1.2: ' — 🔄 1·W2', 1.3: ' — 🔄 1·W2' }],
    ['⛔ <reason>', { ...DONE, 1.3: ' — ⛔ 👤 D14 the sandbox account' }],
    ['✂️ cut: <reason>', { ...DONE, 1.3: ' — ✂️ cut: folded into 1.2' }],
    ['🔄 then ⛔', { ...DONE, 1.2: ' — 🔄 1·W2 — ⛔ waiting on the owner' }],
  ])('%s', (_, suffix) => {
    const doc = board(suffix)
    expect(lint(doc)).toEqual([])
    // The needs list is read without its suffix.
    expect(task(doc, '1.3').needs).toEqual(['1.1 · 👤 a sandbox account'])
  })

  it('and ✅ still does, with its date and sha', () => {
    expect(lint(board(DONE))).toEqual([])
    expect(task(board(DONE), '1.1')).toMatchObject({ doneDate: '2026-09-30', doneSha: 'ff71f66' })
  })
})

describe('the status rules', () => {
  const messages = (suffix) => lint(board(suffix)).map((f) => `[${f.rule}] ${f.message}`)

  it('refuses a malformed suffix, naming the form it should take', () => {
    expect(messages({ ...DONE, 1.2: ' — 🔄 soon' })).toEqual([
      '[task-status] 1.2 has a status suffix that does not parse: "🔄 soon" is not "🔄 <phase>·W<k>"',
    ])
    expect(messages({ ...DONE, 1.3: ' — ✂️ gone' })[0]).toMatch(/is not "✂️ cut: <reason>"/)
    expect(messages({ ...DONE, 1.3: ' — ⛔' })).toHaveLength(1)
  })

  it('keeps the checkbox and ✅ together', () => {
    expect(messages({})).toEqual([
      '[task-status] 1.1 is ticked [x] but has no "— ✅ YYYY-MM-DD <sha>"',
    ])
    expect(messages({ ...DONE, 1.2: ' — ✅ 2026-09-30 abc1234' })).toEqual([
      '[task-status] 1.2 is marked ✅ but its box is not ticked',
    ])
  })

  it('checks 🔄 names its own phase and wave', () => {
    expect(messages({ ...DONE, 1.2: ' — 🔄 2·W2' })).toEqual([
      '[task-status] 1.2 is 🔄 2·W2, but it is a phase 1 task',
    ])
    expect(messages({ ...DONE, 1.2: ' — 🔄 1·W1' })).toEqual([
      '[task-status] 1.2 is 🔄 in W1, but its **Wave** is W2',
    ])
  })

  it('refuses contradictory suffixes', () => {
    expect(messages({ ...DONE, 1.2: ' — ✂️ cut: dropped — 🔄 1·W2' })).toContain(
      '[task-status] 1.2 is marked both ✂️ and 🔄',
    )
  })

  it('flags an open task still needing a ✂️ task', () => {
    expect(messages({ ...DONE, 1.2: ' — ✂️ cut: dropped' })).toEqual([
      '[needs-cut] 2.1 needs 1.2, but 1.2 is ✂️ cut: it will never be ✅',
    ])
  })

  it('stops counting a ✂️ task towards the eight-task limit', () => {
    const many = Array.from(
      { length: 9 },
      (_, i) =>
        `- [ ] **1.${i + 1} T** · needs: —${i === 8 ? ' — ✂️ cut: too many' : ''}\n  - **Wave** W1\n  - **Owns** \`f/${i}/**\`\n  - [ ] 1.${i + 1}.a **Check:** ok\n`,
    ).join('\n')
    expect(
      checkPhaseLimits(parseTasksMd(`## Phase 1 — M · Foundation · needs — · ~1d\n\n${many}`)),
    ).toEqual([])
  })
})

describe('--phase/--wave readiness with 🔄, ⛔ and ✂️', () => {
  const readiness = (suffix, phase, wave) => {
    const model = parseTasksMd(board(suffix))
    return checkWaveReadiness(model, allTasks(model), phase, wave)
  }

  it('a 🔄 task is not ✅: what needs it waits, and says why', () => {
    const result = readiness({ ...DONE, 1.2: ' — 🔄 1·W2' }, 2, 'W1')
    expect(result.ready).toBe(false)
    expect(result.blockers).toContain('2.1 needs 1.2, not ticked yet (🔄 in flight)')
  })

  it('a 🔄 task in the wave asks nothing more of it', () => {
    expect(readiness({ ...DONE, 1.2: ' — 🔄 1·W2', 1.3: ' — 🔄 1·W2' }, 1, 'W2')).toEqual({
      ready: true,
      blockers: [],
    })
  })

  it('a ⛔ task holds its wave, with its reason', () => {
    const result = readiness({ ...DONE, 1.3: ' — ⛔ 👤 D14' }, 1, 'W2')
    expect(result).toEqual({ ready: false, blockers: ['1.3 is ⛔ blocked: 👤 D14'] })
  })

  it('a ✂️ task stops counting: its wave and its phase can finish without it', () => {
    expect(readiness({ ...DONE, 1.3: ' — ✂️ cut: folded' }, 1, 'W2').ready).toBe(true)
    // Phase 1 with 1.2 ticked and 1.3 cut is done, so phase 2 may open.
    const doc = board({ ...DONE, 1.2: ' — ✅ 2026-09-30 abc1234', 1.3: ' — ✂️ cut: folded' })
      .replace('- [ ] **1.2', '- [x] **1.2')
      .replace('  - [ ] 1.2.a', '  - [x] 1.2.a')
    const model = parseTasksMd(doc)
    expect(checkWaveReadiness(model, allTasks(model), 2, 'W1')).toEqual({
      ready: true,
      blockers: [],
    })
  })

  it('a wave whose every task is ✂️ has nothing to dispatch', () => {
    const cut = ' — ✂️ cut: x'
    expect(readiness({ ...DONE, 1.2: cut, 1.3: cut }, 1, 'W2').ready).toBe(false)
  })

  it('a task needing an unticked ✂️ task is blocked until the need is re-pointed', () => {
    const result = readiness({ ...DONE, 1.2: ' — ✂️ cut: dropped' }, 2, 'W1')
    expect(result.blockers).toContain('2.1 needs 1.2, which is ✂️ cut: re-point the need')
  })
})
