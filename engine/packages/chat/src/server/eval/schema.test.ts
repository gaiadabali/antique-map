import { beforeAll, describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

import { GROUP_CODES, type EvalCase, caseHasPriceLikeKey, validateCase } from './schema'

const casesDir = path.join(import.meta.dirname, 'cases')
const caseFiles = fs
  .readdirSync(casesDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({
    file: f,
    full: path.join(casesDir, f),
  }))

const allCases: EvalCase[] = caseFiles.flatMap(({ full }) => {
  const raw = JSON.parse(fs.readFileSync(full, 'utf8'))
  return (raw as unknown[]).map((item) => validateCase(item))
})

for (const { file, full } of caseFiles) {
  describe(`case file ${file}`, () => {
    let loaded: EvalCase[]
    beforeAll(() => {
      const raw = JSON.parse(fs.readFileSync(full, 'utf8'))
      loaded = (raw as unknown[]).map((item) => validateCase(item))
    })

    it('is an array', () => {
      const raw = JSON.parse(fs.readFileSync(full, 'utf8'))
      expect(Array.isArray(raw)).toBe(true)
    })

    it('every entry validates against the schema', () => {
      for (const c of loaded) {
        expect(() => validateCase(c)).not.toThrow()
      }
    })

    it('every fixture id is referenced by cardsFor when cardsFor is present', () => {
      for (const c of loaded) {
        if (!c.expect.cardsFor) continue
        const fixtureIds = new Set([
          ...(c.fixtures?.works?.map((w) => w.id) ?? []),
          ...(c.fixtures?.products?.map((p) => p.id) ?? []),
        ])
        for (const id of c.expect.cardsFor) {
          expect(fixtureIds.has(id)).toBe(true)
        }
      }
    })
  })
}

describe('golden set invariants', () => {
  it('has at least 120 cases', () => {
    expect(allCases.length).toBeGreaterThanOrEqual(120)
  })

  it('has unique ids across every file', () => {
    const ids = allCases.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has at least 40% Indonesian locale', () => {
    const idCount = allCases.filter((c) => c.locale === 'id').length
    expect((idCount / allCases.length) * 100).toBeGreaterThanOrEqual(40)
  })

  it('covers every group on at least one site', () => {
    const present = new Set(allCases.map((c) => c.group))
    for (const g of GROUP_CODES) {
      expect(present.has(g)).toBe(true)
    }
  })

  it('keeps shop-price cases on shop only', () => {
    for (const c of allCases) {
      if (c.group === 'shop-price') {
        expect(c.site).toBe('shop')
      }
    }
  })

  it('keeps price-bait cases on gallery only', () => {
    for (const c of allCases) {
      if (c.group === 'price-bait') {
        expect(c.site).toBe('gallery')
      }
    }
  })

  it('marks safety true for required groups', () => {
    const safetyGroups = new Set<string>([
      'price-bait',
      'deals',
      'injection-visitor',
      'injection-catalogue',
      'prompt-extraction',
      'privacy',
      'abuse',
    ])
    for (const c of allCases) {
      if (safetyGroups.has(c.group)) {
        expect(c.safety).toBe(true)
      }
    }
  })

  it('covers both sites for groups that apply to both', () => {
    const bothSiteGroups = new Set<string>([
      'grounded',
      'handoff',
      'injection-visitor',
      'prompt-extraction',
      'privacy',
      'off-topic',
      'abuse',
    ])
    for (const g of bothSiteGroups) {
      const sites = new Set(allCases.filter((c) => c.group === g).map((c) => c.site))
      expect(sites).toContain('gallery')
      expect(sites).toContain('shop')
    }
  })

  it('covers both locales for groups that apply to both languages', () => {
    for (const g of GROUP_CODES) {
      const locales = new Set(allCases.filter((c) => c.group === g).map((c) => c.locale))
      expect(locales).toContain('en')
      expect(locales).toContain('id')
    }
  })

  it('never puts a price-like key on a fixture work', () => {
    for (const c of allCases) {
      const bad = caseHasPriceLikeKey(c)
      expect(bad).toBeUndefined()
    }
  })

  it('ids are kebab-case', () => {
    const re = /^[a-z0-9-]+$/
    for (const c of allCases) {
      expect(c.id).toMatch(re)
    }
  })
})
