// TASKS.md 5.6.b — the legacy-domain list is real: each digest is a domain docs/MIGRATION.md
// documents (the file under engine/ can hold no domain itself), and the matcher finds a domain
// and its subdomains but no property chain or longer name that merely ends like one.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { LEGACY_DOMAIN_DIGESTS, legacyDomainMatcher, sha256 } from './legacy-domains.mjs'

const MIGRATION = fileURLToPath(new URL('../../../docs/MIGRATION.md', import.meta.url))

describe('LEGACY_DOMAIN_DIGESTS', () => {
  it('names only domains docs/MIGRATION.md documents, each once', () => {
    const text = readFileSync(MIGRATION, 'utf8').toLowerCase()
    const documented = new Set(
      [...text.matchAll(/[a-z0-9-]+(?:\.[a-z0-9-]+)+/g)].map(([name]) => sha256(name)),
    )
    expect(LEGACY_DOMAIN_DIGESTS.length).toBeGreaterThan(0)
    expect(new Set(LEGACY_DOMAIN_DIGESTS).size).toBe(LEGACY_DOMAIN_DIGESTS.length)
    for (const digest of LEGACY_DOMAIN_DIGESTS) expect(documented.has(digest), digest).toBe(true)
  })
})

describe('legacyDomainMatcher', () => {
  const hits = legacyDomainMatcher([sha256('atlas-old.example')])

  it('finds the domain in a URL, in any case, and under a subdomain', () => {
    expect(hits("fetch('https://atlas-old.example/x')")).toEqual(['atlas-old.example'])
    expect(hits('mail to desk@WWW.ATLAS-OLD.EXAMPLE')).toEqual(['atlas-old.example'])
  })

  it('ignores a longer name, a property chain, and a line with no hostname', () => {
    expect(hits('new-atlas-old.example.test and old.example')).toEqual([])
    expect(hits('config.domains.aliases.atlas')).toEqual([])
    expect(hits('const atlas = 1')).toEqual([])
  })

  it('bans nothing when given no digest', () => {
    expect(legacyDomainMatcher([])('https://atlas-old.example')).toEqual([])
  })
})
