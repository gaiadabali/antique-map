/**
 * C9's masters and the print ceiling (v1.4, TASKS.md 6.2.e): the ceiling comes from the pixels
 * that are printed — a design's crop, or the object's box for a whole sheet — never from the
 * master file's long edge, which also holds the background, the colour card and the ruler.
 */
import { describe, expect, it } from 'vitest'

import {
  boxFits,
  CAPTURE_TIERS,
  INTAKE_VERDICTS,
  MIN_PRINT_PPI,
  objectPpi,
  PRINT_RESTORATIONS,
  printCeilingMm,
  printCeilingOf,
  publishableVerdict,
  RETOUCHING_STATES,
  type IntakeEntry,
  type IntakeManifest,
  type PixelBox,
} from '../src/contract'

describe('the print ceiling', () => {
  it('keeps v1.1’s arithmetic: a long edge in pixels at a ppi, to the nearest mm', () => {
    expect(MIN_PRINT_PPI).toBe(240)
    expect(printCeilingMm(3543)).toBe(375)
    expect(printCeilingMm(3543, 300)).toBe(300)
  })

  it('reads the object, not the frame: a legacy 3543 × 2840 file whose sheet spans 3300 px', () => {
    const frame = { width: 3543, height: 2840 }
    const sheet: PixelBox = { x: 120, y: 95, width: 3300, height: 2650 }
    expect(boxFits(sheet, frame.width, frame.height)).toBe(true)
    expect(printCeilingOf(sheet)).toBe(349)
    expect(printCeilingOf(sheet)).toBeLessThan(printCeilingOf(frame))
  })

  it('reads a design’s crop by its own long edge, whichever way it lies', () => {
    expect(printCeilingOf({ width: 1200, height: 2400 })).toBe(254)
    expect(printCeilingOf({ width: 2400, height: 1200 }, 300)).toBe(203)
  })
})

describe('the object in the frame', () => {
  it('measures object ppi from the object’s pixels and its real size, never a DPI tag', () => {
    // a 520 mm sheet across 3300 px of the frame
    expect(objectPpi(3300, 520)).toBe(161)
    // 240 ppi or more lets the shop print the work at its own size (intake-spec.md §4)
    expect(objectPpi(6100, 520)).toBeGreaterThanOrEqual(MIN_PRINT_PPI)
  })

  it.each<[string, PixelBox, boolean]>([
    ['inside', { x: 10, y: 10, width: 100, height: 50 }, true],
    ['touching the far edges', { x: 0, y: 0, width: 400, height: 300 }, true],
    ['past the right edge', { x: 350, y: 0, width: 51, height: 10 }, false],
    ['at a negative origin', { x: -1, y: 0, width: 10, height: 10 }, false],
    ['empty', { x: 0, y: 0, width: 0, height: 10 }, false],
    ['on a fractional pixel', { x: 0.5, y: 0, width: 10, height: 10 }, false],
  ])('a box %s of a 400 × 300 image fits: %s', (_case, box, fits) => {
    expect(boxFits(box, 400, 300)).toBe(fits)
  })
})

describe('what the intake records', () => {
  it('keeps no rejected file, and holds back only a "fix — owner" from its role', () => {
    expect(INTAKE_VERDICTS).toEqual(['pass', 'fix-owner', 'legacy'])
    expect(INTAKE_VERDICTS.filter(publishableVerdict)).toEqual(['pass', 'legacy'])
    expect(CAPTURE_TIERS).toEqual(['good', 'better', 'best'])
    expect(RETOUCHING_STATES).toContain('retouched-legacy')
  })

  it('describes a pilot capture fully before any collection exists', () => {
    const sheet: PixelBox = { x: 410, y: 300, width: 6100, height: 3990 }
    const entry: IntakeEntry = {
      checksum: 'ab'.repeat(32),
      extension: 'cr3',
      receivedAs: 'M-9999_recto_01.cr3',
      reference: 'M.9999',
      role: 'recto',
      provenance: 'photograph',
      widthPx: 6960,
      heightPx: 4640,
      objectBox: sheet,
      objectPpi: 298,
      captureTier: 'better',
      verdict: 'pass',
      retouching: 'none',
      notes: ['ΔE00 2.9'],
    }
    const colourCard: IntakeEntry = {
      ...entry,
      role: 'reference',
      objectBox: null,
      objectPpi: null,
    }
    const manifest: IntakeManifest = {
      batch: 'pilot-2026-10',
      receivedAt: '2026-10-20T10:00:00+08:00',
      entries: [colourCard, entry],
    }
    expect(boxFits(sheet, entry.widthPx, entry.heightPx)).toBe(true)
    expect(printCeilingOf(sheet)).toBe(646)
    expect(manifest.entries).toHaveLength(2)
  })
})

describe('restoring a print file', () => {
  it('names each disclosed restoration once, cropping not among them', () => {
    expect(new Set(PRINT_RESTORATIONS).size).toBe(PRINT_RESTORATIONS.length)
    expect(PRINT_RESTORATIONS).toContain('digitally-coloured')
    expect(PRINT_RESTORATIONS).not.toContain('crop')
  })
})
