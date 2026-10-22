import { describe, expect, it } from 'vitest'

import { isAllowed, parseRobots } from '../robots.ts'

const TEXT = `
# a comment
User-agent: SomeBot
Disallow: /

User-agent: testreader
User-agent: another
Disallow: /private
Allow: /private/open
Disallow: /*.pdf$
Crawl-delay: 4

User-agent: *
Disallow: /cart
Disallow:
Sitemap: https://old-store.example/sitemap-index.xml
`

describe('robots.txt', () => {
  it('picks the group naming our product token, else the * group', () => {
    const ours = parseRobots(TEXT, 'TestReader')
    expect(ours.rules).toHaveLength(3)
    expect(ours.crawlDelaySeconds).toBe(4)
    const anyone = parseRobots(TEXT, 'Unlisted')
    expect(anyone.rules).toEqual([{ allow: false, pattern: '/cart' }])
    expect(anyone.sitemaps).toEqual(['https://old-store.example/sitemap-index.xml'])
  })

  it('lets the longest match win, Allow winning a tie, with * and $ wildcards', () => {
    const policy = parseRobots(TEXT, 'testreader')
    expect(isAllowed(policy, '/private/x')).toBe(false)
    expect(isAllowed(policy, '/private/open/y')).toBe(true)
    expect(isAllowed(policy, '/docs/catalogue.pdf')).toBe(false)
    expect(isAllowed(policy, '/docs/catalogue.pdf?x=1')).toBe(true)
    expect(isAllowed(policy, '/product/1-x')).toBe(true)
    expect(isAllowed(parseRobots('User-agent: *\nAllow: /a\nDisallow: /a\n', 'x'), '/a')).toBe(true)
  })

  it('reads an empty Disallow as allowing everything (the old site answers exactly that)', () => {
    const policy = parseRobots('User-agent: *\nDisallow:\n', 'x')
    expect(policy.rules).toEqual([])
    expect(isAllowed(policy, '/anything?page=2')).toBe(true)
  })
})
