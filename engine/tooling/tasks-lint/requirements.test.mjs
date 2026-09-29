import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { discoverRequirementIds, findUncoveredRequirements } from './requirements.mjs'

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

function writeFixtureRequirements(root) {
  const dir = join(root, '.claude', 'specs', 'indies-platform')
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'requirements.md'),
    [
      '### Requirement 1 — Fixture one',
      '#### Acceptance Criteria',
      '1. The system SHALL do a thing.',
      '2. The system SHALL do another thing.',
      '',
      '### Requirement 2 — Fixture two',
      '#### Acceptance Criteria',
      '1. The system SHALL do a third thing.',
    ].join('\n'),
  )
}

describe('discoverRequirementIds', () => {
  it('degrades explicitly when requirements.md does not exist', () => {
    sandbox = mkdtempSync(join(tmpdir(), 'req-'))
    expect(discoverRequirementIds(sandbox)).toEqual({ ids: [], available: false })
  })

  it('reads every N.M criterion id in file order', () => {
    sandbox = mkdtempSync(join(tmpdir(), 'req-'))
    writeFixtureRequirements(sandbox)
    expect(discoverRequirementIds(sandbox).ids).toEqual(['1.1', '1.2', '2.1'])
  })
})

describe('findUncoveredRequirements', () => {
  it('flags a criterion no task claims — the real repo currently claims all 161 (2.2.i evidence)', () => {
    sandbox = mkdtempSync(join(tmpdir(), 'req-'))
    writeFixtureRequirements(sandbox)
    const tasks = [{ requirements: ['1.1', '2.1'] }]
    expect(findUncoveredRequirements(sandbox, tasks)).toEqual({
      uncovered: ['1.2'],
      available: true,
    })
  })
})
