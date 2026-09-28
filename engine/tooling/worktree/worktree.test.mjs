import { describe, expect, it } from 'vitest'

import {
  LANES,
  MAX_PHASE,
  RESERVED_PORTS,
  allocatePort,
  branchName,
  dbSuffix,
  parseLane,
  parsePhase,
} from './allocate.mjs'
import { mergeEnv, parseEnv } from './env-file.mjs'

const pairs = []
for (let phase = 1; phase <= MAX_PHASE; phase += 1) {
  for (const lane of LANES) pairs.push([phase, lane])
}

describe('port allocation', () => {
  it('is deterministic for a (phase, lane)', () => {
    expect(allocatePort(1, 'HAR')).toBe(allocatePort(1, 'HAR'))
    expect(allocatePort(1, 'HAR')).toBe(4101)
    expect(allocatePort(2, 'ARC')).toBe(4132)
  })

  it('gives every known (phase, lane) its own port, none reserved', () => {
    const ports = pairs.map(([phase, lane]) => allocatePort(phase, lane))
    expect(new Set(ports).size).toBe(pairs.length)
    for (const port of ports) expect(RESERVED_PORTS.has(port)).toBe(false)
  })

  it('moves a reserved base port to the spill range (phase 34 BRD would be 5173)', () => {
    expect(allocatePort(34, 'BRD')).not.toBe(5173)
    expect(allocatePort(34, 'BRD')).not.toBe(allocatePort(34, 'QA'))
  })

  it('steps past ports other worktrees already use', () => {
    const own = allocatePort(3, 'SCH')
    expect(allocatePort(3, 'SCH', new Set([own]))).toBe(own + 1)
    expect(allocatePort(3, 'SCH', new Set([own, own + 1]))).toBe(own + 2)
  })

  it('places split lanes (ARC-P, ARC-D) in stable slots of their phase', () => {
    const p = allocatePort(1, 'ARC-P')
    expect(allocatePort(1, 'ARC-P')).toBe(p)
    expect(p).toBeGreaterThanOrEqual(4100 + LANES.length)
    expect(p).toBeLessThan(4132)
  })
})

describe('database suffix and branch', () => {
  it('is unique per (phase, lane) and identifier-safe', () => {
    const suffixes = pairs.map(([phase, lane]) => dbSuffix(phase, lane))
    expect(new Set(suffixes).size).toBe(pairs.length)
    for (const suffix of suffixes) expect(suffix).toMatch(/^p[0-9]+_[a-z][a-z0-9_]*$/)
    expect(dbSuffix(1, 'HAR')).toBe('p1_har')
    expect(dbSuffix(1, 'ARC-P')).toBe('p1_arc_p')
  })

  it('names the branch feat/p<phase>-<lane>', () => {
    expect(branchName(17, 'UXG')).toBe('feat/p17-uxg')
  })

  it('rejects bad arguments', () => {
    expect(() => parsePhase('0')).toThrow()
    expect(() => parsePhase('1.5')).toThrow()
    expect(() => parsePhase(String(MAX_PHASE + 1))).toThrow()
    expect(() => parseLane('har; rm -rf /')).toThrow()
    expect(parseLane('arc-p')).toBe('ARC-P')
  })
})

describe('.env.local merge', () => {
  const wanted = { PORT: '4101', DB_SUFFIX: 'p1_har' }

  it('adds missing keys under a header in a new file, and is idempotent', () => {
    const first = mergeEnv('', wanted, { header: ['# header'] })
    expect(first.text).toBe('# header\nPORT=4101\nDB_SUFFIX=p1_har\n')
    const second = mergeEnv(first.text, wanted)
    expect(second.text).toBe(first.text)
    expect(second.outcome).toEqual({ PORT: 'unchanged', DB_SUFFIX: 'unchanged' })
  })

  it('never overwrites an existing key without force, and keeps other lines', () => {
    const before = 'SECRET=abc\r\nPORT=5000\r\n'
    const kept = mergeEnv(before, wanted)
    expect(kept.outcome.PORT).toBe('kept')
    expect(parseEnv(kept.text).get('PORT')).toBe('5000')
    expect(parseEnv(kept.text).get('SECRET')).toBe('abc')
    expect(kept.text).toContain('\r\n')

    const forced = mergeEnv(before, wanted, { force: true })
    expect(forced.outcome.PORT).toBe('overwritten')
    expect(parseEnv(forced.text).get('PORT')).toBe('4101')
    expect(parseEnv(forced.text).get('SECRET')).toBe('abc')
  })
})
