/**
 * C9's keys: a master received before its work exists — the owner's pilot set — gets a key it can
 * be filed from, and no caller can steer a key out of its batch. One media bucket and one masters
 * bucket serve both sites, so no key carries a brand segment (TASKS.md 2.4.b), and the
 * configurator's print files are gone.
 */
import { describe, expect, it } from 'vitest'

import * as contract from '../src/contract'
import {
  derivativeKey,
  iiifFullKey,
  iiifPublicKey,
  INTAKE_MASTERS_PREFIX,
  intakeManifestKey,
  intakeMasterKey,
  masterKey,
} from '../src/contract'

const SHA = 'ab'.repeat(32)
const ID = '0123456789abcdef0123456789abcdef'

describe('the keys', () => {
  it('name derivatives, the private pyramid and a work master, with no brand segment', () => {
    expect(derivativeKey(ID, 1024, 'webp')).toBe(`derivatives/v1/${ID}/1024.webp`)
    expect(iiifFullKey(ID)).toBe(`iiif-full/${ID}`)
    expect(masterKey('AB-000123', SHA, 'tif')).toBe(`masters/AB-000123/${SHA}.tif`)
  })

  it('no longer name a print file', () => {
    expect('printFileKey' in contract).toBe(false)
    expect('PRINT_FILES_PREFIX' in contract).toBe(false)
  })
})

describe('where the media bucket is public', () => {
  // The media bucket's public policy grants exactly these (`@engine/media/storage`'s
  // `PUBLIC_MEDIA_PREFIXES`, applied by `storage:policies`; DEPLOYMENT.md §2).
  const PUBLIC_PREFIXES = ['derivatives/', 'iiif/']
  const isPublic = (key: string) => PUBLIC_PREFIXES.some((prefix) => key.startsWith(prefix))

  it('serves the ladder and the capped tiles from the public prefixes', () => {
    expect(isPublic(derivativeKey(ID, 2400, 'avif'))).toBe(true)
    expect(isPublic(`${iiifPublicKey(ID)}/info.json`)).toBe(true)
  })

  it('keeps the uncapped pyramid private: `iiif-full/` is never `iiif/`', () => {
    const key = `${iiifFullKey(ID)}/info.json`
    expect(key.startsWith('iiif-full/')).toBe(true)
    expect(isPublic(key)).toBe(false)
  })
})

describe('intakeMasterKey()', () => {
  it('files a capture under its batch, by its checksum', () => {
    const key = intakeMasterKey('pilot-2026-10', SHA, 'cr3')
    expect(key).toBe(`masters/intake/pilot-2026-10/${SHA}.cr3`)
    expect(key.startsWith(INTAKE_MASTERS_PREFIX)).toBe(true)
    // C12's `MasterKey` shape: masters/<…>/<name>.<extension>
    expect(key).toMatch(/^masters\/.+\/[0-9a-f]{64}\.[a-z0-9]+$/)
  })

  it('never collides with a work master: a work uid is never the lower-case "intake"', () => {
    // A work-uid prefix is upper-case letters or digits, then a hyphen and a number.
    for (const workUid of ['AB-000001', 'XYZ-000123', 'T3-000009']) {
      expect(masterKey(workUid, SHA, 'jpg').startsWith(INTAKE_MASTERS_PREFIX)).toBe(false)
    }
  })

  it.each([
    ['a batch with a slash', () => intakeMasterKey('batch/a', SHA, 'jpg'), /batch/],
    ['a dot segment', () => intakeMasterKey('..', SHA, 'jpg'), /batch/],
    ['an upper-case batch', () => intakeMasterKey('Pilot', SHA, 'jpg'), /batch/],
    ['an empty batch', () => intakeMasterKey('', SHA, 'jpg'), /batch/],
    ['a batch over 64 characters', () => intakeMasterKey('x'.repeat(65), SHA, 'jpg'), /64/],
    ['a short checksum', () => intakeMasterKey('b', 'ab'.repeat(31), 'jpg'), /SHA/],
    ['an upper-case checksum', () => intakeMasterKey('b', 'AB'.repeat(32), 'jpg'), /SHA/],
    ['an upper-case extension', () => intakeMasterKey('b', SHA, 'CR3'), /extension/],
    ['a two-part extension', () => intakeMasterKey('b', SHA, 'tar.gz'), /extension/],
  ])('refuses %s', (_case, build, message) => {
    expect(build).toThrow(message)
  })
})

describe('intakeManifestKey()', () => {
  it('sits beside its batch and can never be a capture’s key', () => {
    const manifest = intakeManifestKey('pilot-2026-10')
    expect(manifest).toBe('masters/intake/pilot-2026-10/intake.json')
    const capture = intakeMasterKey('pilot-2026-10', SHA, 'json')
    expect(capture).not.toBe(manifest)
    expect(capture.slice(0, capture.lastIndexOf('/'))).toBe(
      manifest.slice(0, manifest.lastIndexOf('/')),
    )
  })

  it('checks its segment as the capture keys do', () => {
    expect(() => intakeManifestKey('../other')).toThrow(/batch/)
  })
})
