/**
 * The redirect rows a site's map is read from (TASKS.md 23.5): today's one CMS filters them by
 * `site`; one site's own CMS (the shop's) has no `site` on its rows, so asking for one would fail —
 * every row there is the site's own.
 */
import { describe, expect, it } from 'vitest'

import { readRedirectMap, type RedirectReader } from './redirect-map'

function reader() {
  const calls: Array<Parameters<RedirectReader['find']>[0]> = []
  const fake: RedirectReader = {
    find: async (args) => {
      calls.push(args)
      return { docs: [{ from: '/old', to: '/new', code: '301' }], hasNextPage: false }
    },
  }
  return { fake, calls }
}

describe('readRedirectMap()', () => {
  it('filters by site where rows carry one', async () => {
    const { fake, calls } = reader()
    await readRedirectMap(fake, 'shop')
    expect(calls[0]?.where).toEqual({ site: { equals: 'shop' } })
  })

  it('reads every row in one site’s own CMS, keyed for that site', async () => {
    const { fake, calls } = reader()
    const map = await readRedirectMap(fake, 'shop', false)
    expect(calls[0]).not.toHaveProperty('where')
    expect([...map.values()]).toEqual([{ to: '/new', code: 301 }])
  })
})
