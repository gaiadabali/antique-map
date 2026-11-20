// This CMS's built config removes each request's upload temp files after every endpoint
// (TASKS.md 8.3.h); the wrapper itself is `@engine/cms-core/hooks`' and tested there.
import { cleansUp } from '@engine/cms-core/hooks'
import { describe, expect, it } from 'vitest'

describe('the config the apps run', () => {
  it('cleans up after every endpoint — root, every collection, every global', async () => {
    const { default: built } = await import('../payload.config')
    const config = await built
    const endpoints = [
      ...config.endpoints,
      ...config.collections.flatMap((c) => c.endpoints || []),
      ...config.globals.flatMap((g) => g.endpoints || []),
    ]
    const posts = endpoints.filter((e) => e.method === 'post' || e.method === 'patch')
    expect(posts.length).toBeGreaterThan(config.collections.length)
    expect(endpoints.filter((e) => !cleansUp(e.handler))).toEqual([])
  }, 30_000) // a cold import of the whole Payload config takes over 5 s on a slow disk
})
