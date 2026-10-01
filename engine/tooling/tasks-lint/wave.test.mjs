import { describe, expect, it } from 'vitest'

import { allTasks, parseTasksMd } from './parse.mjs'
import { checkWaveReadiness } from './wave.mjs'

const DOC = `## Phase 1 — Fixture · Foundation · needs — · ~1d

- [x] **1.1 First** · needs: — — ✅ 2026-01-01 abc123
  - **Wave** W1
  - **Owns** \`fixture/a/**\`
  - [x] 1.1.a **Check:** ok

- [ ] **1.2 Second** · needs: 1.1
  - **Wave** W2
  - **Owns** \`fixture/b/**\`
  - [ ] 1.2.a **Check:** ok

- [ ] **1.3 Third** · needs: 1.2
  - **Wave** W2
  - **Owns** \`fixture/c/**\`
  - [ ] 1.3.a **Check:** ok

## Phase 2 — Needs phase 1 · Foundation · needs 1 · ~1d

- [ ] **2.1 Only** · needs: 1.1
  - **Wave** W1
  - **Owns** \`fixture/d/**\`
  - [ ] 2.1.a **Check:** ok
`

describe('checkWaveReadiness', () => {
  it('is ready when the dependency is ticked', () => {
    const model = parseTasksMd(DOC)
    const tasks = allTasks(model)
    expect(checkWaveReadiness(model, tasks, 1, 'W1').ready).toBe(true)
  })

  it('is not ready when a same-phase dependency is not ticked yet', () => {
    // Wave W2 holds 1.2 (needs 1.1, ticked — fine) and 1.3 (needs 1.2, NOT ticked yet).
    const model = parseTasksMd(DOC)
    const tasks = allTasks(model)
    const result = checkWaveReadiness(model, tasks, 1, 'W2')
    expect(result.ready).toBe(false)
    expect(result.blockers.some((b) => b.includes('1.3 needs 1.2, not ticked yet'))).toBe(true)
  })

  it("is not ready when the phase's own needs are not ✅ yet", () => {
    // Phase 2 needs phase 1, but phase 1 is not fully done (1.2/1.3 unticked).
    const model = parseTasksMd(DOC)
    const tasks = allTasks(model)
    const result = checkWaveReadiness(model, tasks, 2, 'W1')
    expect(result.ready).toBe(false)
    expect(result.blockers.some((b) => b.includes('phase 2 needs phase 1, not ✅ yet'))).toBe(true)
  })
})

describe('checkWaveReadiness — an Owns overlap inside the wave (gate F4)', () => {
  const overlapping = DOC.replace('**Owns** `fixture/c/**`', '**Owns** `fixture/{b,c}/**`')

  it('is not ready, naming both tasks and paths, as the full lint does', () => {
    const model = parseTasksMd(overlapping)
    const result = checkWaveReadiness(model, allTasks(model), 1, 'W2')
    expect(result.ready).toBe(false)
    expect(result.blockers).toContain(
      'Owns overlap: 1.2 and 1.3 share wave W2: "fixture/b/**" overlaps "fixture/{b,c}/**"',
    )
  })

  it('leaves a wave without one alone, and a ✂️ task owns nothing', () => {
    const cut = overlapping.replace(
      '- [ ] **1.3 Third** · needs: 1.2',
      '- [ ] **1.3 Third** · needs: 1.2 — ✂️ cut: fixture',
    )
    for (const doc of [DOC, cut]) {
      const model = parseTasksMd(doc)
      const { blockers } = checkWaveReadiness(model, allTasks(model), 1, 'W2')
      expect(blockers.filter((b) => b.startsWith('Owns overlap'))).toEqual([])
    }
  })
})
