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
    expect(invalid.lines[0]).toMatch(/the CMS global's contact is not valid \(contact\.email: /)

    const notAnObject = logged()
    expect((await mergeEditorialGlobals(file, () => 'menu', notAnObject.log)).config).toBe(file)
    expect(notAnObject.lines[0]).toMatch(/the CMS globals are not an object/)
  })

  it('reads a Payload-shaped document: unknown keys stripped, nulls unset, each part on its own', async () => {
    const { lines, log } = logged()
    const payloadDoc = {
      id: 7,
      globalType: 'brandSettings',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-29T00:00:00.000Z',
      contact: { email: 'not an email', whatsapp: null, phone: null }, // refused, alone
      social: { instagram: 'https://instagram.example/gallery', facebook: null, tiktok: '' },
      announcement: { en: 'Closed on Sunday', id: 'Tutup hari Minggu', nl: null },
      navigation: {
        header: [
          {
            id: '66f1a',
            surface: 'search',
            slug: null,
            label: { en: 'Search', id: 'Cari', nl: null },
          },
        ],
        footer: null,
      },
    }
    const merged = await mergeEditorialGlobals(file, () => payloadDoc, log)
    expect(merged.source).toBe('cms')
    expect(merged.config.identity.contact).toEqual(file.identity.contact) // the bad part's floor
    expect(merged.config.identity.social.instagram).toBe('https://instagram.example/gallery')
    expect(merged.config.identity.announcement).toEqual({
      en: 'Closed on Sunday',
      id: 'Tutup hari Minggu',
    })
    expect(merged.config.identity.navigation.header).toEqual([
      { surface: 'search', label: { en: 'Search', id: 'Cari' } },
    ]) // the valid menu survives the bad e-mail address
    expect(merged.config.identity.navigation.footer).toEqual(file.identity.navigation.footer)
    expect(lines).toEqual([
      expect.stringMatching(
        /^brand config: the CMS global's contact is not valid \(contact\.email: /,
      ),
    ])
  })

  it('opens an editor’s social link only over https', async () => {
    for (const url of ['javascript:alert(1)', 'http://instagram.example/x', 'data:text/html,hi']) {
      const { lines, log } = logged()
      const merged = await mergeEditorialGlobals(file, () => ({ social: { instagram: url } }), log)
      expect(merged.config.identity.social.instagram, url).toBe(file.identity.social.instagram)
      expect(lines[0], url).toMatch(/the CMS global's social is not valid \(social\.instagram: /)
    }
  })

  it('logs each reason once per process, while every call still reports it', async () => {
    const { lines, log } = logged()
    const down = () => {
      throw new Error('connect failed for postgres://app:p@ss@db.internal:5432/ig_db')
    }
    const first = await mergeEditorialGlobals(file, down, log)
    const second = await mergeEditorialGlobals(file, down, log)
    expect(lines).toEqual([
      "brand config: the CMS globals could not be read (connect failed for postgres://…@db.internal:5432/ig_db); serving the brand file's floor",
    ]) // once, and the password (with its @) never reaches the log
    expect(second.fallbacks).toEqual(first.fallbacks)
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
      'the CMS global\'s navigation.header is unusable (identity.navigation.header[0].surface: links to "partnership", whose module "accounts.retailers" is off',
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
