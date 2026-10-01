/**
 * C9's keys (v1.1's unchanged, v1.4's intake keys added): a master received before its work exists
 * — the owner's pilot set — gets a key it can be filed from, and no caller can steer a key out of
 * its batch.
 */
import { describe, expect, it } from 'vitest'

import {
  derivativeKey,
  iiifFullKey,
  INTAKE_MASTERS_PREFIX,
  intakeManifestKey,
  intakeMasterKey,
  masterKey,
  printFileKey,
} from '../src/contract'

const SHA = 'ab'.repeat(32)

describe('v1.1 keys, unchanged', () => {
  it('names derivatives, the private pyramid, a work master and a print file as before', () => {
    const id = '0123456789abcdef0123456789abcdef'
    expect(derivativeKey(id, 1024, 'webp')).toBe(`derivatives/v1/${id}/1024.webp`)
    expect(iiifFullKey('brand-a', id)).toBe(`iiif-full/brand-a/${id}`)
    expect(masterKey('AB-000123', SHA, 'tif')).toBe(`masters/AB-000123/${SHA}.tif`)
    expect(printFileKey('brand-b', 'A-0042', SHA, 'tif')).toBe(
      `print-files/brand-b/A-0042/${SHA}.tif`,
    )
  })
})

describe('intakeMasterKey()', () => {
  it('files a capture under its brand and batch, by its checksum', () => {
    const key = intakeMasterKey('brand-a', 'pilot-2026-10', SHA, 'cr3')
    expect(key).toBe(`masters/intake/brand-a/pilot-2026-10/${SHA}.cr3`)
    expect(key.startsWith(INTAKE_MASTERS_PREFIX)).toBe(true)
    // C12's `MasterKey` shape: masters/<…>/<name>.<extension>
    expect(key).toMatch(/^masters\/.+\/[0-9a-f]{64}\.[a-z0-9]+$/)
  })

  it('never collides with a work master: a work uid is never the lower-case "intake"', () => {
    // C1's work-uid prefix is upper-case letters or digits, then a hyphen and a number.
    for (const workUid of ['AB-000001', 'XYZ-000123', 'T3-000009']) {
      expect(masterKey(workUid, SHA, 'jpg').startsWith(INTAKE_MASTERS_PREFIX)).toBe(false)
    }
  })

  it.each([
    ['a brand with a slash', () => intakeMasterKey('brand/a', 'b', SHA, 'jpg'), /brand/],
    ['a dot segment', () => intakeMasterKey('brand-a', '..', SHA, 'jpg'), /batch/],
    ['an upper-case batch', () => intakeMasterKey('brand-a', 'Pilot', SHA, 'jpg'), /batch/],
    ['an empty batch', () => intakeMasterKey('brand-a', '', SHA, 'jpg'), /batch/],
    ['a batch over 64 characters', () => intakeMasterKey('b', 'x'.repeat(65), SHA, 'jpg'), /64/],
    ['a short checksum', () => intakeMasterKey('brand-a', 'b', 'ab'.repeat(31), 'jpg'), /SHA/],
    [
      'an upper-case checksum',
      () => intakeMasterKey('brand-a', 'b', 'AB'.repeat(32), 'jpg'),
      /SHA/,
    ],
    ['an upper-case extension', () => intakeMasterKey('brand-a', 'b', SHA, 'CR3'), /extension/],
    ['a two-part extension', () => intakeMasterKey('brand-a', 'b', SHA, 'tar.gz'), /extension/],
  ])('refuses %s', (_case, build, message) => {
    expect(build).toThrow(message)
  })
})

describe('intakeManifestKey()', () => {
  it('sits beside its batch and can never be a capture’s key', () => {
    const manifest = intakeManifestKey('brand-a', 'pilot-2026-10')
    expect(manifest).toBe('masters/intake/brand-a/pilot-2026-10/intake.json')
    const capture = intakeMasterKey('brand-a', 'pilot-2026-10', SHA, 'json')
    expect(capture).not.toBe(manifest)
    expect(capture.slice(0, capture.lastIndexOf('/'))).toBe(
      manifest.slice(0, manifest.lastIndexOf('/')),
    )
  })

  it('checks its segments as the capture keys do', () => {
    expect(() => intakeManifestKey('brand-a', '../other')).toThrow(/batch/)
  })
})
