import { describe, expect, it } from 'vitest'

import { REPO_ROOT, testEnv } from '../validate/testing/fixtures'
import { getBrandConfig, loadBrandConfig, mergeEditorialGlobals } from './index'

const file = loadBrandConfig({ env: testEnv('gallery'), cwd: REPO_ROOT })

function logged() {
  const lines: string[] = []
  return { lines, log: (line: string) => void lines.push(line) }
}

describe('the CMS-global merge seam — file as the floor (BRANDS.md §3)', () => {
  it('lays valid globals over the file’s floors', async () => {
    const { lines, log } = logged()
    const merged = await mergeEditorialGlobals(
      file,
      async () => ({
        contact: { email: 'editor@test-gallery.example' },
        social: { facebook: 'https://facebook.example/test' },
        announcement: { en: 'Closed on Sunday', id: 'Tutup hari Minggu' },
        navigation: { header: [{ surface: 'search', label: { en: 'Search', id: 'Cari' } }] },
      }),
      log,
    )
    expect(merged.source).toBe('cms')
    expect(merged.config.identity.contact.email).toBe('editor@test-gallery.example')
    expect(merged.config.identity.contact.whatsapp).toBe(file.identity.contact.whatsapp)
    expect(merged.config.identity.social).toEqual({
      ...file.identity.social,
      facebook: 'https://facebook.example/test',
    })
    expect(merged.config.identity.announcement?.en).toBe('Closed on Sunday')
    expect(merged.config.identity.navigation.header).toHaveLength(1)
    expect(merged.config.identity.navigation.footer).toEqual(file.identity.navigation.footer)
    expect(merged.config.modules).toBe(file.modules) // structure never comes from a global
    expect(lines).toEqual([])
  })

  it('falls back to the file and logs why when the globals cannot be read', async () => {
    const { lines, log } = logged()
    const merged = await mergeEditorialGlobals(
      file,
      async () => {
        throw new Error('connect ECONNREFUSED 127.0.0.1:5432')
      },
      log,
    )
    expect(merged).toMatchObject({ source: 'file', config: file })
    expect(lines).toEqual([
      "brand config: the CMS globals could not be read (connect ECONNREFUSED 127.0.0.1:5432); serving the brand file's floor",
    ])
  })

  it('falls back and logs why when the globals are missing or invalid', async () => {
    const missing = logged()
    expect((await mergeEditorialGlobals(file, () => null, missing.log)).config).toBe(file)
    expect(missing.lines[0]).toMatch(
      /no CMS globals are saved yet; serving the brand file's floor$/,
    )

    const invalid = logged()
    const merged = await mergeEditorialGlobals(
      file,
      () => ({ contact: { email: 'not an email' } }),
      invalid.log,
    )
    expect(merged.config).toBe(file)
    expect(invalid.lines[0]).toMatch(/the CMS globals are not valid \(contact\.email: /)
  })

  it('keeps a floor for every empty global — an empty menu never empties the masthead', async () => {
    const { lines, log } = logged()
    const merged = await mergeEditorialGlobals(
      file,
      () => ({
        navigation: { header: [], footer: [] },
        announcement: {},
        contact: { whatsapp: null },
      }),
      log,
    )
    expect(merged.source).toBe('file')
    expect(merged.config.identity).toEqual(file.identity)
    expect(lines).toEqual([])
  })

  it('keeps the file’s menu, and says so, when the global’s links lead nowhere', async () => {
    const { lines, log } = logged()
    const merged = await mergeEditorialGlobals(
      file,
      () => ({
        announcement: { en: 'Open late on Friday' },
        navigation: { header: [{ surface: 'partnership', label: { en: 'Partners' } }] },
      }),
      log,
    )
    expect(merged.config.identity.navigation).toEqual(file.identity.navigation)
    expect(merged.config.identity.announcement?.en).toBe('Open late on Friday')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain(
      'the CMS global\'s navigation is unusable (identity.navigation.header[0].surface: links to "partnership", whose module "accounts.retailers" is off',
    )
  })

  it('getBrandConfig() loads the file and merges the globals the caller reads', async () => {
    const config = await getBrandConfig({
      env: testEnv('gallery'),
      cwd: REPO_ROOT,
      readGlobals: () => ({ contact: { phone: '+15555550199' } }),
      log: () => undefined,
    })
    expect(config.identity.contact.phone).toBe('+15555550199')
  })
})
