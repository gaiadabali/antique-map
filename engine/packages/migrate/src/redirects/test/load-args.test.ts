/** The loader CLI's bare-word arguments (9.4load): `payload run` drops flags, so words it is. */
import { describe, expect, it } from 'vitest'

import { parseLoadArgs } from '../load-args'

describe('parseLoadArgs', () => {
  it('reads the site, the mode and the options as bare words', () => {
    expect(parseLoadArgs(['gallery', 'dry-run'])).toEqual({
      sites: ['gallery'],
      dryRun: true,
      prune: false,
      unresolvedOut: null,
    })
    expect(parseLoadArgs(['all', 'apply', 'prune', 'unresolved-out=/tmp/out'])).toEqual({
      sites: ['gallery', 'shop'],
      dryRun: false,
      prune: true,
      unresolvedOut: '/tmp/out',
    })
    expect(parseLoadArgs(['site=shop', 'apply']).sites).toEqual(['shop'])
  })

  it('ignores the lone `--` pnpm passes on', () => {
    expect(parseLoadArgs(['--', '--', 'gallery', 'dry-run']).sites).toEqual(['gallery'])
  })

  it('never defaults to a write: a run without its mode word is refused', () => {
    expect(() => parseLoadArgs(['gallery'])).toThrow(/dry-run or apply/)
    expect(() => parseLoadArgs([])).toThrow(/name the site/)
  })

  it('refuses a flag by name, an unknown word, and a contradiction', () => {
    expect(() => parseLoadArgs(['gallery', '--dry-run'])).toThrow(/flags are not read/)
    expect(() => parseLoadArgs(['gallery', 'apply', 'nuke'])).toThrow(/unknown argument/)
    expect(() => parseLoadArgs(['gallery', 'apply', 'dry-run'])).toThrow(/not both/)
    expect(() => parseLoadArgs(['gallery', 'shop', 'apply'])).toThrow(/once/)
    expect(() => parseLoadArgs(['gallery', 'apply', 'unresolved-out='])).toThrow(/unknown argument/)
  })
})
