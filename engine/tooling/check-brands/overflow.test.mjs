// TASKS.md 6.3.m — the synthetic brand's +30% rule (./overflow.mjs): on this repository's copy
// no lexicon value is short; a planted short value fails, naming the key, both lengths and the
// real brand it is measured against; a short value on a shell key does not, the shell being
// exempt. The real brands are found as C1 discovers them, never named (CONVENTIONS.md §1).
import { cpSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { discoverBrandConfigs, formatIssue, validateBrandConfigs } from '@engine/config/validate'
import { afterEach, describe, expect, it } from 'vitest'

import { LEXICON_MESSAGES as emporiumLexicon } from '../../apps/emporium/src/messages/keys.ts'
import { SHELL_MESSAGES as emporiumShell } from '../../apps/emporium/src/shell/messages.ts'
import { supports as emporium } from '../../apps/emporium/src/supports.ts'
import { LEXICON_MESSAGES as galleryLexicon } from '../../apps/gallery/src/messages/keys.ts'
import { SHELL_MESSAGES as galleryShell } from '../../apps/gallery/src/shell/messages.ts'
import { supports as gallery } from '../../apps/gallery/src/supports.ts'
import { checkCopy } from '../../packages/i18n/src/copy.ts'
import { checkBrands } from './check-brands.mjs'
import { checkOverflowCopy, leastLengthOver, lengthOf } from './overflow.mjs'
import { ENGINE_REPO_ROOT } from './supports.mjs'

const REPO = realpathSync(ENGINE_REPO_ROOT)
const RESULTS = discoverBrandConfigs(REPO).map((each) => ({ ...each, issues: [] }))
/** The synthetic brand (one config per storefront) and the real ones (one `brand.config.json`). */
const SYNTHETIC = RESULTS.find((each) => each.storefront !== null)
const REAL = [...new Set(RESULTS.filter((each) => each.storefront === null).map((r) => r.brand))]
const COPY = `${SYNTHETIC.brand}/site/copy`

const checks = {
  validateBrandConfigs,
  formatIssue,
  supports: { gallery, emporium },
  apps: { gallery: 'gallery', emporium: 'emporium' },
  checkCopy,
  keys: {
    gallery: { ...galleryLexicon, ...galleryShell },
    emporium: { ...emporiumLexicon, ...emporiumShell },
  },
  lexicon: { gallery: Object.keys(galleryLexicon), emporium: Object.keys(emporiumLexicon) },
}

const read = (root, file) => JSON.parse(readFileSync(join(root, file), 'utf8'))

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

/** A repo holding every brand's configs and copy (not their assets), copied from this one. */
function sandboxed({ withReal = true } = {}) {
  sandbox = realpathSync(mkdtempSync(join(tmpdir(), 'check-overflow-')))
  const filter = (from) => !/[\\/]assets([\\/]|$)/.test(from)
  for (const brand of [SYNTHETIC.brand, ...(withReal ? REAL : [])])
    cpSync(join(REPO, brand, 'site'), join(sandbox, brand, 'site'), { recursive: true, filter })
  return sandbox
}

/** The sandbox with the synthetic brand's `locale` copy changed by `edit`. */
function plant(locale, edit, root = sandboxed()) {
  const file = `${COPY}/${locale}.json`
  writeFileSync(join(root, file), JSON.stringify(edit(read(root, file)), null, 2))
  return root
}

/** The longest real brand value for `key` in `locale`, and the brand that gives it. */
function longestReal(key, locale) {
  const values = REAL.map((brand) => ({
    brand,
    text: read(REPO, `${brand}/site/copy/${locale}.json`)[key],
  }))
  return values
    .filter(({ text }) => typeof text === 'string')
    .reduce((best, each) => (lengthOf(each.text) > lengthOf(best.text) ? each : best))
}

describe('the +30% overflow rule (6.3.m)', () => {
  it('passes this repository’s copy: no short value, each locale’s values measured', () => {
    const { passed, problems } = checkOverflowCopy(RESULTS, checks)
    expect(problems).toEqual([])
    expect(passed).toHaveLength(1)
    expect(passed[0]).toMatch(
      new RegExp(
        `^${COPY} \\(${SYNTHETIC.brand}, lexicon values ≥ ceil\\(1\\.3 ×\\) the longest real brand value: (\\w+ [1-9]\\d*(, )?){3}\\)$`,
      ),
    )
    expect(REAL.length).toBeGreaterThanOrEqual(2)
  })

  it('fails a short lexicon value in a locale the real brands ship, naming the brand it is under', () => {
    const { brand, text } = longestReal('status.sold', 'en')
    const root = plant('en', (copy) => ({ ...copy, 'status.sold': 'x' }))
    const { ok, problems } = checkBrands(root, checks)
    expect(ok).toBe(false)
    const least = leastLengthOver(lengthOf(text))
    expect(problems).toEqual([
      `${SYNTHETIC.brand}: ${COPY}/en.json (en): "status.sold" is 1 characters, under the +30% overflow rule: it needs ${least} (ceil(1.3 × ${lengthOf(text)}, ${brand}))`,
    ])
  })

  it('fails a value one short of ceil(1.3 ×), and passes it at exactly that length', () => {
    const { text } = longestReal('status.sold', 'id')
    const least = leastLengthOver(lengthOf(text))
    const short = plant('id', (copy) => ({ ...copy, 'status.sold': 'a'.repeat(least - 1) }))
    expect(checkBrands(short, checks).problems).toEqual([
      expect.stringContaining(`"status.sold" is ${least - 1} characters`),
    ])
    plant('id', (copy) => ({ ...copy, 'status.sold': 'a'.repeat(least) }), short)
    expect(checkBrands(short, checks)).toMatchObject({ ok: true, problems: [] })
  })

  it('measures nl, which no real brand ships, against the app default and the en values', () => {
    const { text } = longestReal('status.sold', 'en')
    const longest = Math.max(lengthOf(text), lengthOf(galleryLexicon['status.sold']))
    const root = plant('nl', (copy) => ({ ...copy, 'status.sold': 'x' }))
    const { problems } = checkBrands(root, checks)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain(`/nl.json (nl): "status.sold" is 1 characters`)
    expect(problems[0]).toContain(`it needs ${leastLengthOver(longest)} (ceil(1.3 × ${longest}, `)
  })

  it('exempts the shell’s keys: a short `shell.*`, `home.*` or `notFound.*` value does not fail', () => {
    const shell = Object.keys(galleryShell)
    expect(shell).toEqual(expect.arrayContaining(['home.title', 'home.lede', 'notFound.title']))
    expect(shell.every((key) => /^(shell\.|home\.(title|lede)$|notFound\.)/.test(key))).toBe(true)
    const root = plant('en', (copy) => ({
      ...copy,
      'shell.contact': 'C',
      'home.lede': 'L',
      'notFound.title': 'T',
    }))
    expect(checkBrands(root, checks)).toMatchObject({ ok: true, problems: [] })
  })

  it('has nothing to measure without a real brand, so it neither fails nor claims a pass', () => {
    const root = sandboxed({ withReal: false })
    const { passed, problems } = checkBrands(root, checks)
    expect(problems).toEqual([])
    expect(passed.some((line) => line.startsWith('overflow '))).toBe(false)
  })
})
