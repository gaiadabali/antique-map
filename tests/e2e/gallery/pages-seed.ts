/**
 * The seed and the edit `pages.spec.ts` runs (TASKS.md 5.4.c), against this worktree's own
 * database (`.env.local`'s `DB_SUFFIX`; `E2E_DATABASE_URL` overrides it, as
 * `tests/e2e/admin/local.mjs` reads it). Each script is written out at run time and run with
 * `payload run` in its own process (mirrors `tests/e2e/shop/payment.spec.ts`'s own pattern):
 * importing the CMS core directly into Playwright's Node process risks pulling in Next-only
 * subpath exports that only resolve under Next's own bundler, not Playwright's loader.
 * Not a spec — Playwright collects `*.spec.ts` alone.
 */
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

/** A dotenv file as a Map; a missing file is an empty Map (mirrors `env-file.mjs`'s `readEnvFile`). */
function readEnvFile(path: string): Map<string, string> {
  if (!existsSync(path)) return new Map()
  const values = new Map<string, string>()
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
    if (match) values.set(match[1]!, match[2]!.replace(/^(['"])(.*)\1$/, '$2'))
  }
  return values
}

/** This worktree's database (`DB_SUFFIX`), exactly as `tests/e2e/admin/local.mjs` reads it. */
function databaseUrl(): string {
  const local = readEnvFile(join(root, '.env.local'))
  const suffix = process.env.DB_SUFFIX ?? local.get('DB_SUFFIX')
  const url =
    process.env.E2E_DATABASE_URL ??
    (suffix ? `postgres://postgres:postgres@127.0.0.1:5432/indies_${suffix}` : undefined)
  if (!url) throw new Error('No database: run `pnpm worktree:env` or set E2E_DATABASE_URL.')
  return url
}

/** The script's preamble: the process's Payload and a lookup that sees drafts too. */
const PREAMBLE = `
import { writeFileSync } from 'node:fs'
process.env.PAYLOAD_SECRET ??= 'e2e-gallery-pages-dev-only-never-signs-anything'
const { cms } = await import('./engine/packages/cms/src/instance')
const { invalidationBatch } = await import('./engine/packages/cache/src/index')
const payload = await cms()
const one = async (collection, where) =>
  (await payload.find({ collection, where, limit: 1, depth: 0, draft: true })).docs[0]
const page = async (site, slug, data) =>
  (await one('pages', { and: [{ site: { equals: site } }, { slug: { equals: slug } }] })) ??
  (await payload.create({ collection: 'pages', locale: 'all', data: { site, kind: 'page', slug, ...data } }))
`

/**
 * A published maker with an available and a sold work, a published place (with a historical name,
 * under a parent place) that the works depict, a published gallery page, a second published page
 * the edit case rewrites, a draft gallery page, and a published *shop* page. Idempotent by slug,
 * so a second run finds what the first made.
 */
const SEED = `${PREAMBLE}
// Outside a request: every published write's cache hook (the works', and the vocabulary's —
// catalogue:gallery) queues its tags on an operation of this batch, flushed once below.
const batch = invalidationBatch()
const grade =
  (await one('terms', { and: [{ kind: { equals: 'grade' } }, { slug: { equals: 'e2e-5-4-grade' } }] })) ??
  (await batch.operation((context) => payload.create({
    collection: 'terms', context,
    data: {
      kind: 'grade', label: 'E2E Very good', slug: 'e2e-5-4-grade',
      definition: 'Light toning, no tears.', equivalent: 'B+', _status: 'published',
    },
  })))
const maker =
  (await one('makers', { slug: { equals: 'e2e-5-4-valentijn' } })) ??
  (await batch.operation((context) => payload.create({
    collection: 'makers', context,
    data: {
      name: 'E2E François Valentijn', sortName: 'VALENTIJN, E2E François', slug: 'e2e-5-4-valentijn',
      roles: ['cartographer'], born: { precision: 'exact', from: 1666 }, died: { precision: 'exact', from: 1727 },
      _status: 'published',
    },
  })))
const java =
  (await one('places', { slug: { equals: 'e2e-5-4-java' } })) ??
  (await batch.operation((context) =>
    payload.create({ collection: 'places', context, data: { name: 'E2E Java', slug: 'e2e-5-4-java', _status: 'published' } }),
  ))
const place =
  (await one('places', { slug: { equals: 'e2e-5-4-batavia' } })) ??
  (await batch.operation((context) => payload.create({
    collection: 'places', context,
    data: {
      name: 'E2E Jakarta', slug: 'e2e-5-4-batavia', parent: java.id,
      historicalNames: [{ name: 'E2E Batavia', language: 'nl', period: '1619-1942' }],
      _status: 'published',
    },
  })))
// A raw row, no real upload (mirrors \`works.test-support.ts\`'s own \`media()\`): the images
// field only needs a media id to publish, and the spec asserts on text, never on an image.
const recto =
  (await one('media', { 'alt.en': { equals: 'E2E 5.4 recto' } })) ??
  (await payload.db.create({
    collection: 'media',
    data: {
      alt: { en: 'E2E 5.4 recto' }, role: 'recto', provenance: 'photograph',
      subject: 'work', filename: \`e2e-5-4-recto-\${Date.now()}.jpg\`, mimeType: 'image/jpeg',
    },
  }))
const complete = (over) => ({
  objectType: 'map',
  date: { precision: 'circa', from: 1726 },
  makers: [{ maker: maker.id, role: 'cartographer', certainty: 'attributed' }],
  places: [{ place: place.id, role: 'depicts', primary: true }],
  condition: { grade: grade.id },
  images: [{ media: recto.id }],
  dimensions: { image: { height: 280, width: 360 }, sheet: { height: 310, width: 400 } },
  ...over,
})
for (const [stockNumber, over] of [
  ['M.E2E0541', { title: 'E2E chart of Java' }],
  ['M.E2E0542', { title: 'E2E sold chart', status: 'sold' }],
]) {
  if (await one('works', { stockNumber: { equals: stockNumber } })) continue
  await batch.operation((context) =>
    payload.create({ collection: 'works', data: complete({ ...over, stockNumber, _status: 'published' }), context }),
  )
}
await batch.flush()
await page('gallery', 'e2e-5-4-page', {
  title: { en: 'E2E fixture page' }, intro: { en: 'A fixture page for the gallery pages e2e spec.' },
  body: { en: 'First paragraph.\\n\\nSecond paragraph.' }, _status: 'published',
})
await page('gallery', 'e2e-5-4-edited', {
  title: { en: 'E2E edited page' }, body: { en: 'Not edited yet.' }, _status: 'published',
})
await page('gallery', 'e2e-5-4-draft', { title: { en: 'E2E draft page' }, body: { en: 'Never published.' } })
await page('shop', 'e2e-5-4-shop-page', {
  title: { en: 'E2E shop-only page' }, body: { en: 'The shop, not the gallery.' }, _status: 'published',
})
writeFileSync(process.env.SCRIPT_OUT, JSON.stringify({ makerSlug: maker.slug, placePath: [java.slug, place.slug] }))
await payload.destroy()
`

/**
 * Republishes the edit case's page with the body `SCRIPT_ARG` names: a draft saved in English,
 * then published. Two steps, because neither one-step publish works today: under `locale: 'en'`
 * `pagePublishGuard` reads `data.title.en` from a flat string and refuses ("title is invalid" —
 * the admin's own publish too; the 5.4 review's finding), and under `locale: 'all'` an update
 * leaves a localized field's new value unwritten. Publishing under `'all'` publishes the draft.
 */
const EDIT = `${PREAMBLE}
const doc = await one('pages', { and: [{ site: { equals: 'gallery' } }, { slug: { equals: 'e2e-5-4-edited' } }] })
if (!doc) throw new Error('the edit case runs after the seed: no e2e-5-4-edited page')
await payload.update({
  collection: 'pages', id: doc.id, locale: 'en', draft: true,
  data: { body: process.env.SCRIPT_ARG, _status: 'draft' },
})
await payload.update({
  collection: 'pages', id: doc.id, locale: 'all',
  data: { title: { en: 'E2E edited page' }, _status: 'published' },
})
writeFileSync(process.env.SCRIPT_OUT, JSON.stringify({ id: doc.id }))
await payload.destroy()
`

/** Writes `script` to a scratch file at the repo root, runs it, answers its JSON — never committed. */
function run<T>(script: string, arg = ''): T {
  const tag = randomBytes(4).toString('hex')
  const scriptPath = join(root, `.e2e-gallery-pages-${tag}.ts`)
  const outPath = join(root, `.e2e-gallery-pages-${tag}.json`)
  writeFileSync(scriptPath, script)
  try {
    execFileSync('pnpm', ['--filter', '@engine/cms', 'payload', 'run', scriptPath], {
      cwd: root,
      encoding: 'utf8',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl(),
        NODE_ENV: 'development',
        SCRIPT_OUT: outPath,
        SCRIPT_ARG: arg,
      },
      stdio: ['ignore', 'inherit', 'inherit'],
    })
    return JSON.parse(readFileSync(outPath, 'utf8')) as T
  } finally {
    rmSync(scriptPath, { force: true })
    rmSync(outPath, { force: true })
  }
}

export type Fixture = {
  readonly makerSlug: string
  readonly placePath: readonly string[]
  readonly pageSlug: 'e2e-5-4-page'
  readonly editedSlug: 'e2e-5-4-edited'
  readonly draftSlug: 'e2e-5-4-draft'
  readonly shopSlug: 'e2e-5-4-shop-page'
}

export function seed(): Fixture {
  const made = run<{ makerSlug: string; placePath: string[] }>(SEED)
  return {
    ...made,
    pageSlug: 'e2e-5-4-page',
    editedSlug: 'e2e-5-4-edited',
    draftSlug: 'e2e-5-4-draft',
    shopSlug: 'e2e-5-4-shop-page',
  }
}

/** Republishes the edit case's page with `body` as its English body. */
export function republishEdited(body: string): void {
  run<{ id: number }>(EDIT, body)
}
