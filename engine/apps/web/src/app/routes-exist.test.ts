/**
 * Every surface a site's route map names has an app route behind it (ARCHITECTURE.md §5). The proxy
 * rewrites `/{segment}/…` to `app/(<site>)/<site>/[locale]/<internal>`; a map entry whose internal
 * folder is missing is a page that 404s for everyone, which no unit test of the router or the page
 * sees on its own. That happened three times in phase 6 (`order`, the shop's `browse`, `collection`).
 *
 * `NOT_BUILT_YET` names the surfaces whose page a later task builds: delete a line when its page lands.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { SITES, SURFACE_ROUTES, type SiteKey } from '@engine/config/sites'

const NOT_BUILT_YET: Record<SiteKey, Partial<Record<string, string>>> = {
  gallery: {
    sellToUs: 'TASKS.md 5.3',
  },
  shop: { stores: 'TASKS.md 7.3' },
}

const appDir = (site: SiteKey) => join(__dirname, `(${site})`, site, '[locale]')

describe('every routed surface has a page', () => {
  for (const site of Object.keys(SITES) as SiteKey[]) {
    const surfaces = Object.keys(SITES[site].routes.en) as (keyof typeof SURFACE_ROUTES)[]
    for (const surface of surfaces) {
      const internal = SURFACE_ROUTES[surface]?.internal
      if (!internal) continue
      const pending = NOT_BUILT_YET[site][surface]
      it(`${site}: ${surface} → ${internal}${pending ? ` (pending ${pending})` : ''}`, () => {
        const base = join(appDir(site), internal.split('/')[0] as string)
        expect(existsSync(base), `app route folder for ${site}'s ${surface}`).toBe(!pending)
      })
    }
  }
})
