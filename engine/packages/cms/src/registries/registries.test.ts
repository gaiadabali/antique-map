import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { AdminViewConfig, Plugin, TaskConfig } from 'payload'
import { describe, expect, it } from 'vitest'

import { DRAFTED_ACCESS } from '../access/published'
import {
  COLLECTION_SLUGS,
  GLOBAL_SLUGS,
  registeredCollections,
  registeredGlobals,
  stubSlugs,
} from './collections'
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

describe('the frozen slug list', () => {
  it('holds CONTENT-MODEL.md’s 39 collections and 6 globals, kebab-case and unique', () => {
    expect(COLLECTION_SLUGS).toHaveLength(39)
    expect(GLOBAL_SLUGS).toHaveLength(6)
    for (const slug of [...COLLECTION_SLUGS, ...GLOBAL_SLUGS]) {
      expect(slug).toMatch(/^[a-z]+(?:-[a-z]+)*$/)
    }
    expect(new Set([...COLLECTION_SLUGS, ...GLOBAL_SLUGS]).size).toBe(45)
  })

  it('registers every collection and global, whatever the modules', () => {
    expect(registeredCollections().map((c) => c.slug)).toEqual([...COLLECTION_SLUGS])
    expect(registeredGlobals().map((g) => g.slug)).toEqual([...GLOBAL_SLUGS])
  })

  it('keeps every unbuilt slug a stub: hidden, admins may read, nobody may write', () => {
    // A task that builds a collection replaces its stub, so the stub list shrinks as the
    // Catalogue stage lands; what holds for each one left is its shape, never a count.
    const stubs = new Set<string>(stubSlugs())
    expect(stubs.has('users')).toBe(false)
    const as = (user: unknown) => ({ req: { user } }) as never
    for (const collection of registeredCollections().filter((c) => stubs.has(c.slug))) {
      expect(collection.admin?.hidden, collection.slug).toBe(true)
      expect(collection.fields, collection.slug).toEqual([])
      expect(collection.access!.read!(as({ collection: 'users', roles: ['admin'] }))).toBe(true)
      expect(collection.access!.read!(as({ collection: 'users', roles: ['editor'] }))).toBe(false)
      expect(collection.access!.create!(as({ collection: 'users', roles: ['admin'] }))).toBe(false)
    }
  })

  it('stores only upload collections in the bucket — media alone; masters is plain (8.3)', () => {
    expect(uploadCollectionSlugs({ collections: registeredCollections() })).toEqual(['media'])
    expect(
      uploadCollectionSlugs({ collections: [{ slug: 'media', upload: true, fields: [] }] }),
    ).toEqual(['media'])
  })
})

describe('one folder per frozen slug (3.2.g)', () => {
  const collectionsDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../collections',
  )

  it('gives every slug its own collections/<slug>/index.ts, its slug written literally', () => {
    for (const slug of COLLECTION_SLUGS) {
      const file = path.join(collectionsDir, slug, 'index.ts')
      expect(fs.existsSync(file), file).toBe(true)
      expect(fs.readFileSync(file, 'utf8')).toMatch(new RegExp(`slug: '${slug}'`))
    }
  })

  it('refuses a registry out of the frozen order, or short of a slug', () => {
    const all = registeredCollections()
    expect(() => registeredCollections([all[1]!, all[0]!, ...all.slice(2)])).toThrow(/position 0/)
    expect(() => registeredCollections(all.slice(1))).toThrow(/38 collections for 39/)
  })
})

describe('drafts need staff-only draft access (S4)', () => {
  const drafted = { slug: 'works', fields: [], versions: { drafts: true } }

  it('refuses a drafts collection or global without read and readVersions', () => {
    const all = registeredCollections()
    const bare = [...all.slice(0, 12), drafted, ...all.slice(13)]
    expect(() => registeredCollections(bare)).toThrow(/access\.read \/ access\.readVersions/)
    const readOnly = { ...drafted, access: { read: DRAFTED_ACCESS.read } }
    expect(() => registeredCollections([...all.slice(0, 12), readOnly, ...all.slice(13)])).toThrow(
      /readVersions/,
    )
    expect(() =>
      registeredGlobals([{ slug: 'homepage', fields: [], versions: { drafts: true } }]),
    ).toThrow(/global "homepage"/)
  })

  it('accepts DRAFTED_ACCESS', () => {
    const all = registeredCollections()
    const ok = { ...drafted, access: { ...DRAFTED_ACCESS } }
    expect(registeredCollections([...all.slice(0, 12), ok, ...all.slice(13)])[12]).toBe(ok)
  })
})
