import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { allocateAppPorts, LANES, MAX_PHASE, RESERVED_PORTS } from './allocate.mjs'
import { appEnvPlan, loggable, postgresEnv, writeAppEnvs } from './app-env.mjs'
import { parseEnv } from './env-file.mjs'

describe('two ports per worktree', () => {
  it('gives every (phase, lane) two ports, all distinct across every worktree and app', () => {
    const all = []
    for (let phase = 1; phase <= MAX_PHASE; phase += 1) {
      for (const lane of LANES) {
        const { gallery, shop } = allocateAppPorts(phase, lane)
        all.push(gallery, shop)
      }
    }
    expect(new Set(all).size).toBe(all.length)
    for (const port of all) {
      expect(RESERVED_PORTS.has(port)).toBe(false)
      expect(port).toBeLessThanOrEqual(65535)
    }
  })

  it('keeps the gallery port today’s and steps the shop’s past ports in use', () => {
    const { gallery, shop } = allocateAppPorts(1, 'HAR')
    expect(gallery).toBe(4101)
    expect(allocateAppPorts(1, 'HAR', new Set([shop])).shop).toBe(shop + 1)
  })
})

describe('an .env.local per app', () => {
  const pg = postgresEnv(new Map([['POSTGRES_PASSWORD', 'pw']]), { PGHOST: 'db.local' })
  const plan = appEnvPlan({ suffix: 'p24_ops', ports: { gallery: 4890, shop: 4891 }, pg })

  it('names each app’s own database, port and hosts', () => {
    expect(plan.gallery.file.replace(/\\/g, '/')).toBe('engine/apps/web/.env.local')
    expect(plan.shop.file.replace(/\\/g, '/')).toBe('engine/apps/shop/.env.local')
    expect(plan.gallery.wanted).toMatchObject({ PORT: '4890', DB_SUFFIX: 'p24_ops' })
    expect(plan.gallery.wanted.DATABASE_URL).toBe(
      'postgres://postgres:pw@db.local:5432/indies_p24_ops',
    )
    expect(plan.shop.wanted.DATABASE_URL).toMatch(/@db\.local:5432\/indies_shop_p24_ops$/)
    expect(plan.shop.wanted).toMatchObject({
      PORT: '4891',
      SITE_HOSTS: 'shop.localhost',
      GALLERY_ORIGIN: 'http://gallery.localhost:4890',
    })
    expect(plan.shop.wanted).not.toHaveProperty('GALLERY_HOSTS')
  })

  it('logs a DATABASE_URL by its database only', () => {
    expect(loggable('DATABASE_URL', plan.gallery.wanted.DATABASE_URL)).toBe('…/indies_p24_ops')
    expect(loggable('PORT', '4890')).toBe('4890')
  })

  let dir
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }))

  it('writes both files with generated secrets, distinct per app, never logged or replaced', () => {
    dir = mkdtempSync(join(tmpdir(), 'app-env-'))
    const lines = []
    writeAppEnvs({ root: dir, plan, log: (line) => lines.push(line) })
    const read = (file) => parseEnv(readFileSync(join(dir, file), 'utf8'))
    const web = read(plan.gallery.file)
    const shop = read(plan.shop.file)
    for (const key of ['PAYLOAD_SECRET', 'BAG_COOKIE_KEY', 'ORDER_LINK_KEY', 'LINK_TOKEN_KEYS']) {
      expect(web.get(key)?.length).toBeGreaterThanOrEqual(32)
      expect(shop.get(key)).not.toBe(web.get(key))
      expect(lines.join('\n')).not.toContain(web.get(key))
    }
    expect(lines.join('\n')).not.toContain(':pw@')
    const before = readFileSync(join(dir, plan.shop.file), 'utf8')
    writeAppEnvs({ root: dir, plan, force: true, log: () => {} })
    expect(readFileSync(join(dir, plan.shop.file), 'utf8')).toBe(before)
  })
})
