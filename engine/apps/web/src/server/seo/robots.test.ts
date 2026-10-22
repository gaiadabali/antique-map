/**
 * Robots.txt helper for ticket 9.3a.
 */
import { describe, expect, it } from 'vitest'

import { buildRobots } from './robots'

describe('buildRobots', () => {
  it('disallows everything unless indexing is allowed', () => {
    const txt = buildRobots('https://antiquemapsindonesia.com', { allowIndexing: false })
    expect(txt).toContain('User-agent: *')
    expect(txt).toContain('Disallow: /')
    expect(txt).not.toContain('Disallow: /api')
    expect(txt).toContain('Sitemap: https://antiquemapsindonesia.com/sitemap.xml')
  })

  it('allows indexing with selective disallows and a sitemap', () => {
    const txt = buildRobots('https://oldeastindies.com', { allowIndexing: true })
    expect(txt).toContain('User-agent: *')
    expect(txt).not.toContain('Disallow: /\n')
    expect(txt).toContain('Disallow: /admin')
    expect(txt).toContain('Disallow: /api')
    expect(txt).toContain('Disallow: /bag')
    expect(txt).toContain('Sitemap: https://oldeastindies.com/sitemap.xml')
  })
})
