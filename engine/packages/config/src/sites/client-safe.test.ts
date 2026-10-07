// `@engine/config/sites` is what a Client Component imports for `createHref()` and `SITES` (the
// shop's variant picker reaches it through its lexicon), so nothing it reaches at runtime may pull
// in the schema library: zod v4 with its locales was ~396 KB of the product page's first-party
// JavaScript (7.4 Lighthouse follow-up). The facet and sort lists the route map needs are the
// zod-free `../constants/facets`.
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { runtimeReach } from '../../../../tooling/client-safe/index.mjs'

describe('@engine/config/sites — safe in the browser', () => {
  it('reaches no zod, and nothing under ../schema', () => {
    const entry = realpathSync(fileURLToPath(new URL('./index.ts', import.meta.url)))
    const reached = [...runtimeReach(entry)]
    expect(
      reached.filter((specifier) => specifier === 'zod' || specifier.startsWith('zod/')),
    ).toEqual([])
    expect(reached.filter((specifier) => specifier.includes('config/schema'))).toEqual([])
  })
})
