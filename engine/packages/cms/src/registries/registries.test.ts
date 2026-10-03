import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { AdminViewConfig, Plugin, TaskConfig } from 'payload'
import { describe, expect, it } from 'vitest'

import { DRAFTED_ACCESS } from '../access/published'
import { registeredCollections, registeredGlobals } from './collections'
import { DuplicateRegistryEntry, uniqueEntries, type RegistryEntry } from './entries'
import { jobTasks } from './jobs'
import { registeredPlugins } from './plugins'
import { uploadCollectionSlugs } from './storage'
import { adminViews } from './views'

const task = (slug: string) => ({ slug, handler: async () => ({ output: {} }) }) as TaskConfig

describe('registry entries', () => {
  it('refuse a name registered twice, naming both owners', () => {
    const entries: RegistryEntry<number>[] = [
      { name: 'tiles', owner: 'MED', value: 1 },
      { name: 'tiles', owner: 'SIS', value: 2 },
    ]
    expect(() => uniqueEntries('jobs.tasks', entries)).toThrow(DuplicateRegistryEntry)
    expect(() => uniqueEntries('jobs.tasks', entries)).toThrow(/by MED and by SIS/)
  })

  it('keep a job registered under its own slug', () => {
    expect(jobTasks([{ name: 'tiles', owner: 'MED', value: task('tiles') }])).toHaveLength(1)
    expect(() => jobTasks([{ name: 'tiles', owner: 'MED', value: task('derivatives') }])).toThrow(
      /slug "derivatives"/,
    )
  })

  it('key admin views by name, and refuse a second view of one name', () => {
    const view = {
      Component: '@engine/cms/admin/views/desk#Desk',
      path: '/desk',
    } as AdminViewConfig
    expect(adminViews([{ name: 'desk', owner: 'ADM', value: view }])).toEqual({ desk: view })
    expect(() =>
      adminViews([
        { name: 'desk', owner: 'ADM', value: view },
        { name: 'desk', owner: 'SCH', value: view },
      ]),
    ).toThrow(DuplicateRegistryEntry)
    expect(adminViews()).toEqual({})
  })

  it('list SCH’s media storage plugin, and refuse a duplicate', () => {
    expect(registeredPlugins({})).toHaveLength(1)
    const plugin = ((config) => config) as Plugin
    expect(() =>
      registeredPlugins({}, [
        { name: 'media-storage', owner: 'SCH', value: plugin },
        { name: 'media-storage', owner: 'MED', value: plugin },
      ]),
    ).toThrow(DuplicateRegistryEntry)
  })
})

/** The collections the config holds after TASKS.md 3.4 (2.4's stubs are gone; 3.4 adds pages, redirects, leads, partners, chat-sessions, events). */
const SLUGS = [
  'users',
  'stores',
  'stock-levels',
  'orders',
  'payment-events',
  'discounts',
  'products',
  'works',
  'makers',
  'places',
  'terms',
  'media',
  'masters',
  'pages',
  'redirects',
  'leads',
  'partners',
  'chat-sessions',
  'events',
]

describe('the registered collections', () => {
  it('are the built collections, in the sidebar order', () => {
    expect(registeredCollections().map((c) => c.slug)).toEqual(SLUGS)
  })

  it('lists the site-settings global', () => {
    expect(registeredGlobals().map((g) => g.slug)).toEqual(['site-settings'])
  })

  it('give every collection its own collections/<slug>/index.ts, its slug written literally', () => {
    const collectionsDir = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../collections',
    )
    for (const slug of SLUGS) {
      const file = path.join(collectionsDir, slug, 'index.ts')
      expect(fs.existsSync(file), file).toBe(true)
      expect(fs.readFileSync(file, 'utf8')).toMatch(new RegExp(`slug: '${slug}'`))
    }
  })

  it('refuse a slug listed twice', () => {
    const all = registeredCollections()
    expect(() => registeredCollections([...all, all[0]!])).toThrow(/"users" is listed twice/)
    const global = { slug: 'site-settings', fields: [] }
    expect(() => registeredGlobals([global, global])).toThrow(/listed twice/)
  })

  it('store only upload collections in the bucket — media alone; masters is plain (8.3)', () => {
    expect(uploadCollectionSlugs({ collections: registeredCollections() })).toEqual(['media'])
  })
})

describe('drafts need staff-only draft access (S4)', () => {
  const drafted = { slug: 'works', fields: [], versions: { drafts: true } }

  it('refuses a drafts collection or global without read and readVersions', () => {
    expect(() => registeredCollections([drafted])).toThrow(/access\.read \/ access\.readVersions/)
    const readOnly = { ...drafted, access: { read: DRAFTED_ACCESS.read } }
    expect(() => registeredCollections([readOnly])).toThrow(/readVersions/)
    expect(() =>
      registeredGlobals([{ slug: 'homepage', fields: [], versions: { drafts: true } }]),
    ).toThrow(/global "homepage"/)
  })

  it('accepts DRAFTED_ACCESS', () => {
    const ok = { ...drafted, access: { ...DRAFTED_ACCESS } }
    expect(registeredCollections([ok])[0]).toBe(ok)
  })
})
