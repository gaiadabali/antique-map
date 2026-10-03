/**
 * `site-settings` access on a real Postgres (TASKS.md 3.4.b): only the owner reads or updates the
 * global. Editors, store staff and the public are refused.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { startWorksStack, server, type Role } from '../../collections/works/works.test-support'

describe.skipIf(!server)('site-settings: access on a real database', () => {
  let stack: Awaited<ReturnType<typeof startWorksStack>>

  beforeAll(async () => {
    stack = await startWorksStack('cms_site_settings_access_test', (config, key) =>
      getPayload({ config, key }),
    )
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  it('only the owner reads site settings; editors, stores and the public are refused', async () => {
    expect((await stack.rest('GET', '/api/globals/site-settings', { role: 'owner' })).status).toBe(
      200,
    )
    for (const role of ['editor', 'store'] as Role[]) {
      expect((await stack.rest('GET', '/api/globals/site-settings', { role })).status).toBe(403)
    }
    expect((await stack.rest('GET', '/api/globals/site-settings')).status).toBe(403)
  })
})
