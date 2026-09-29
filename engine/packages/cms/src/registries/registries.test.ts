import type { AdminViewConfig, Plugin, TaskConfig } from 'payload'
import { describe, expect, it } from 'vitest'

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

  it('stubs everything but users: hidden, admins may read, nobody may write', () => {
    expect(stubSlugs()).not.toContain('users')
    expect(stubSlugs()).toHaveLength(38)
    const works = registeredCollections().find((c) => c.slug === 'works')!
    expect(works.admin?.hidden).toBe(true)
    expect(works.fields).toEqual([])
    const as = (user: unknown) => ({ req: { user } }) as never
    expect(works.access!.read!(as({ collection: 'users', roles: ['admin'] }))).toBe(true)
    expect(works.access!.read!(as({ collection: 'users', roles: ['editor'] }))).toBe(false)
    expect(works.access!.create!(as({ collection: 'users', roles: ['admin'] }))).toBe(false)
  })

  it('stores only upload collections in the bucket — none until 8.3 builds media', () => {
    expect(uploadCollectionSlugs({ collections: registeredCollections() })).toEqual([])
    expect(
      uploadCollectionSlugs({ collections: [{ slug: 'media', upload: true, fields: [] }] }),
    ).toEqual(['media'])
  })
})
