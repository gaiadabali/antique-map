import { describe, expect, it } from 'vitest'

import { allTasks, parseTasksMd } from './parse.mjs'
import {
  ALL_RULES,
  checkEndsInCheck,
  checkNeedsResolvable,
  checkNoSameWaveDependency,
  checkOwnsOverlap,
  checkPhaseNeedsMatchTasks,
  checkUniqueIds,
} from './rules.mjs'

/** A tiny two-phase fixture doc, so each rule can be tested without the real 2530-line TASKS.md. */
function fixtureDoc({ task1bOwns = '`fixture/a/**`', task1cNeeds = '1.1' } = {}) {
  return `## Phase 1 — Fixture one · Foundation · needs — · ~1d

- [ ] **1.1 First** · needs: —
  - **Lane** HAR · **Agent** devops · **Wave** W1
  - **Owns** \`fixture/a/**\`
  - _Requirements: 1.1_
  - [ ] 1.1.a do a thing
  - [ ] 1.1.b **Check:** it works

- [ ] **1.2 Second** · needs: ${task1cNeeds}
  - **Lane** HAR · **Agent** devops · **Wave** W1
  - **Owns** ${task1bOwns}
  - _Requirements: 1.2_
  - [ ] 1.2.a do another thing
  - [ ] 1.2.b **Check:** it also works

## Phase 2 — Fixture two · Foundation · needs 1 · ~1d

- [ ] **2.1 Third** · needs: 1.1
  - **Lane** HAR · **Agent** devops · **Wave** W1
  - **Owns** \`fixture/c/**\`
  - _Requirements: 1.3_
  - [ ] 2.1.a do a third thing
  - [ ] 2.1.b **Check:** it works too
`
}

describe('checkOwnsOverlap — the planted violation (2.2.i)', () => {
  it('flags two tasks in one wave with overlapping Owns, clears once disjoint', () => {
    const overlapping = parseTasksMd(fixtureDoc({ task1bOwns: '`fixture/a/child/**`' }))
    const violated = checkOwnsOverlap(overlapping)
    expect(violated).toHaveLength(1)
    expect(violated[0].message).toMatch(/1.1 and 1.2 share wave W1/)

    const clean = parseTasksMd(fixtureDoc({ task1bOwns: '`fixture/b/**`' }))
    expect(checkOwnsOverlap(clean)).toEqual([])
  })
})

describe('checkUniqueIds', () => {
  it('flags a repeated task id', () => {
    const doc = fixtureDoc().replace('**1.2 Second**', '**1.1 Second**')
    const model = parseTasksMd(doc)
    const findings = checkUniqueIds(model, allTasks(model))
    expect(findings.some((f) => f.message.includes('"1.1" is declared twice'))).toBe(true)
  })
})

describe('checkNeedsResolvable', () => {
  it('flags a needs token that does not exist', () => {
    const model = parseTasksMd(fixtureDoc({ task1cNeeds: '9.9' }))
    const findings = checkNeedsResolvable(model, allTasks(model))
    expect(findings.some((f) => f.message.includes('"9.9", which does not exist'))).toBe(true)
  })
})

describe('checkPhaseNeedsMatchTasks', () => {
  it("flags a task needing a phase not reachable through the heading's declared chain", () => {
    const doc = fixtureDoc()
      .replace('· needs 1 · ~1d', '· needs — · ~1d')
      .replace('**2.1 Third** · needs: 1.1', '**2.1 Third** · needs: phase 1')
    const model = parseTasksMd(doc)
    const findings = checkPhaseNeedsMatchTasks(model, allTasks(model))
    expect(findings.some((f) => f.message.includes('not reachable through'))).toBe(true)
  })

  it('is clean when the heading already declares the phase its task needs', () => {
    const model = parseTasksMd(fixtureDoc())
    expect(checkPhaseNeedsMatchTasks(model, allTasks(model))).toEqual([])
  })
})

describe('checkNoSameWaveDependency', () => {
  it('flags a task depending on another task in its own wave', () => {
    const model = parseTasksMd(fixtureDoc())
    const findings = checkNoSameWaveDependency(model, allTasks(model))
    expect(findings.some((f) => f.message.includes('1.2 (wave W1) depends on 1.1'))).toBe(true)
  })
})

describe('size and lanes are not linted (1.3.d)', () => {
  it('passes nine tasks in four waves of one phase, with no lane', () => {
    const many = Array.from(
      { length: 9 },
      (_, i) =>
        `- [ ] **1.${i + 1} Task** · needs: —\n  - **Wave** W${(i % 4) + 1}\n  - **Owns** \`fixture/t${i}/**\`\n  - [ ] 1.${i + 1}.a **Check:** ok\n`,
    ).join('\n')
    const model = parseTasksMd(`## Phase 1 — Many · Foundation · needs — · ~1d\n\n${many}`)
    expect(ALL_RULES.flatMap((rule) => rule(model, allTasks(model)))).toEqual([])
  })
})

describe('checkEndsInCheck', () => {
  it('passes the fixture: one Check, last, in every task', () => {
    const model = parseTasksMd(fixtureDoc())
    expect(checkEndsInCheck(model, allTasks(model))).toEqual([])
  })

  it('flags a task whose last subtask is not a Check', () => {
    const doc = fixtureDoc().replace('1.1.b **Check:** it works', '1.1.b something else entirely')
    const model = parseTasksMd(doc)
    const findings = checkEndsInCheck(model, allTasks(model))
    expect(findings.some((f) => f.message.includes('1.1 does not end in a **Check:**'))).toBe(true)
  })

  it('flags a second Check, wherever it is planted', () => {
    const appended = fixtureDoc().replace(
      '  - [ ] 1.1.b **Check:** it works\n',
      '  - [ ] 1.1.b **Check:** it works\n  - [ ] 1.1.c **Check:** and again\n',
    )
    const before = fixtureDoc().replace('1.1.a do a thing', '1.1.a **Check:** too early')
    for (const doc of [appended, before]) {
      const model = parseTasksMd(doc)
      const messages = checkEndsInCheck(model, allTasks(model)).map((f) => f.message)
      expect(messages).toEqual([
        expect.stringMatching(/^1\.1\.[ab] is a \*\*Check:\*\* but not 1\.1's last/),
      ])
    }
  })
})
