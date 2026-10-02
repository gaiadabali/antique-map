// Every message key has an English and an Indonesian value (TASKS.md 1.3.a): what was left of
// `check:brands`' copy half once the brand machinery went (CARRY-OVER.md §2.3). Each site's copy
// is its lexicon folder, `engine/apps/web/src/sites/<site>/lexicon/` (CONVENTIONS.md §6), found on
// disk, never named, so a site added there is checked too.
//
// The English file is the reference: `checkCopy()` (`@engine/i18n/copy`, the same rules the app
// loads copy by) refuses an empty English value, an Indonesian key with no value, an Indonesian
// key English lacks, and an Indonesian value whose `{placeholders}` differ. Plural forms follow
// each locale's rules, so English `x.one` needs no Indonesian twin (Indonesian selects `other`
// alone).
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { checkCopy } from '../../packages/i18n/src/copy.ts'

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const SITES_DIR = join(REPO_ROOT, 'engine', 'apps', 'web', 'src', 'sites')
const REQUIRED = ['en', 'id']

/** Every site's `lexicon/` folder that holds an `en.json`, relative to `root`, sorted. */
function findCopyFolders(root) {
  if (!existsSync(SITES_DIR)) return []
  return readdirSync(SITES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(SITES_DIR, entry.name, 'lexicon'))
    .filter((path) => existsSync(join(path, 'en.json')))
    .map((path) => relative(root, path).split('\\').join('/'))
    .sort()
}

/** Every problem with one copy folder's English and Indonesian values, as readable lines. */
function copyProblems(copyDir) {
  const problems = REQUIRED.filter((locale) => !existsSync(join(copyDir, `${locale}.json`))).map(
    (locale) => `${locale}.json is missing`,
  )
  if (problems.length > 0) return problems
  const raw = JSON.parse(readFileSync(join(copyDir, 'en.json'), 'utf8'))
  const english = Object.fromEntries(
    Object.entries(raw).filter(([key, value]) => !key.startsWith('$') && value !== ''),
  )
  const empty = Object.keys(raw).filter((key) => !key.startsWith('$') && raw[key] === '')
  return [
    ...empty.map((key) => `en.json has no value for "${key}"`),
    ...checkCopy({ defaults: english, copyDir, locales: ['id'] }).map((issue) => issue.message),
  ]
}

describe('every message key has an en and an id value (1.3.a)', () => {
  const folders = findCopyFolders(REPO_ROOT)

  it('finds each site’s lexicon folder on disk', () => {
    expect(folders).toEqual([
      'engine/apps/web/src/sites/gallery/lexicon',
      'engine/apps/web/src/sites/shop/lexicon',
    ])
  })

  it.each(folders)('%s', (folder) => {
    expect(copyProblems(join(REPO_ROOT, folder))).toEqual([])
  })
})

describe('copyProblems — on planted gaps', () => {
  const planted = (en, id) => {
    const dir = mkdtempSync(join(tmpdir(), 'copy-complete-'))
    writeFileSync(join(dir, 'en.json'), JSON.stringify(en))
    if (id) writeFileSync(join(dir, 'id.json'), JSON.stringify(id))
    return dir
  }
  let dirs = []
  afterEach(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
    dirs = []
  })
  const problemsOf = (en, id) => {
    const dir = planted(en, id)
    dirs.push(dir)
    return copyProblems(dir)
  }

  it('passes a complete pair, an English-only plural form included', () => {
    const en = { a: 'A', 'n.one': 'One', 'n.other': '{count} items' }
    expect(problemsOf(en, { a: 'A', 'n.other': '{count} barang' })).toEqual([])
  })

  it('refuses a missing id.json, an empty value, a key one side lacks and a lost placeholder', () => {
    expect(problemsOf({ a: 'A' })).toEqual(['id.json is missing'])
    expect(problemsOf({ a: '', b: 'B {name}' }, { b: 'B', c: 'C' })).toEqual([
      'en.json has no value for "a"',
      'id.json "b" must carry {name}',
      'id.json has "c", which the app does not define',
    ])
    expect(problemsOf({ a: 'A' }, { a: '' })).toEqual(['id.json has no "a"'])
  })
})
