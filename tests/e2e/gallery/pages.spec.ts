/**
 * The gallery's maker, place and editorial pages (TASKS.md 5.4), on the gallery host, a production
 * build: a seeded maker and a seeded place each list their works, a published page renders, and
 * every one of these pages is axe clean at a phone's 390 px and a desktop's 1280 px.
 *
 * Seeds its own maker, place and pages through the Local API, against this worktree's own database
 * (`.env.local`'s `DB_SUFFIX`; `E2E_DATABASE_URL` overrides it, as `tests/e2e/admin/local.mjs`
 * reads it). The seed script is written out at run time and run with `payload run` in its own
 * process (mirrors `tests/e2e/shop/payment.spec.ts`'s own pattern): importing the CMS core
 * directly into Playwright's Node process risks pulling in Next-only subpath exports that only
 * resolve under Next's own bundler, not Playwright's loader.
 */
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

type EnvMap = Map<string, string>

/** A dotenv file as a Map; a missing file is an empty Map (mirrors `env-file.mjs`'s `readEnvFile`). */
function readEnvFile(path: string): EnvMap {
  if (!existsSync(path)) return new Map()
  const values: EnvMap = new Map()
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
    if (match) values.set(match[1]!, match[2]!.replace(/^(['"])(.*)\1$/, '$2'))
  }
  return values
}

/** This worktree's database (`DB_SUFFIX`) and port, exactly as `tests/e2e/admin/local.mjs` reads them. */
function settings(): { readonly databaseUrl: string; readonly port: string } {
  const local = readEnvFile(join(root, '.env.local'))
  const get = (key: string) => process.env[key] ?? local.get(key)
  const suffix = get('DB_SUFFIX')
  const database = suffix ? `indies_${suffix}` : undefined
  const databaseUrl =
    process.env.E2E_DATABASE_URL ??
    (database ? `postgres://postgres:postgres@127.0.0.1:5432/${database}` : undefined)
  if (!databaseUrl) throw new Error('No database: run `pnpm worktree:env` or set E2E_DATABASE_URL.')
  return { databaseUrl, port: process.env.E2E_PORT ?? get('PORT') ?? '4200' }
}

const { databaseUrl } = settings()

/**
 * The seed script `payload run` executes: a published maker with an available and a sold work, a
 * published place (with a historical name and a child place) with its own available work, and a
 * published `pages` record (`kind: 'page'`) with a body and a hero-free intro. Idempotent by slug,
 * so a second run finds what the first made.
 */
const SEED_SCRIPT = `
import { writeFileSync } from 'node:fs'
process.env.PAYLOAD_SECRET ??= 'e2e-gallery-pages-dev-only-never-signs-anything'
const { cms } = await import('./engine/packages/cms/src/instance')

const payload = await cms()
const one = async (collection, where) =>
  (await payload.find({ collection, where, limit: 1, depth: 0, draft: true })).docs[0]

const grade =
  (await one('terms', { and: [{ kind: { equals: 'grade' } }, { slug: { equals: 'e2e-5-4-grade' } }] })) ??
  (await payload.create({
    collection: 'terms',
    data: {
      kind: 'grade', label: 'E2E Very good', slug: 'e2e-5-4-grade',
      definition: 'Light toning, no tears.', equivalent: 'B+', _status: 'published',
    },
  }))

const maker =
  (await one('makers', { slug: { equals: 'e2e-5-4-valentijn' } })) ??
  (await payload.create({
    collection: 'makers',
    data: {
      name: 'E2E François Valentijn', sortName: 'VALENTIJN, E2E François', slug: 'e2e-5-4-valentijn',
      roles: ['cartographer'], born: { precision: 'exact', from: 1666 }, died: { precision: 'exact', from: 1727 },
      _status: 'published',
    },
  }))

const java =
  (await one('places', { slug: { equals: 'e2e-5-4-java' } })) ??
  (await payload.create({ collection: 'places', data: { name: 'E2E Java', slug: 'e2e-5-4-java', _status: 'published' } }))

const place =
  (await one('places', { slug: { equals: 'e2e-5-4-batavia' } })) ??
  (await payload.create({
    collection: 'places',
    data: {
      name: 'E2E Jakarta', slug: 'e2e-5-4-batavia', parent: java.id,
      historicalNames: [{ name: 'E2E Batavia', language: 'nl', period: '1619-1942' }],
      _status: 'published',
    },
  }))

// A raw row, no real upload (mirrors \`works.test-support.ts\`'s own \`media()\`): the images
// field only needs a media id to publish, and this spec asserts on text, never on an image.
const recto =
  (await one('media', { 'alt.en': { equals: 'E2E 5.4 recto' } })) ??
  (await payload.db.create({
    collection: 'media',
    data: {
      alt: { en: 'E2E 5.4 recto' }, role: 'photograph', provenance: 'photograph',
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

if (!(await one('works', { stockNumber: { equals: 'E2E.0541' } }))) {
  await payload.create({ collection: 'works', data: complete({ title: 'E2E chart of Java', stockNumber: 'E2E.0541', _status: 'published' }) })
}
if (!(await one('works', { stockNumber: { equals: 'E2E.0542' } }))) {
  await payload.create({ collection: 'works', data: complete({ title: 'E2E sold chart', stockNumber: 'E2E.0542', status: 'sold', _status: 'published' }) })
}

if (!(await one('pages', { and: [{ site: { equals: 'gallery' } }, { slug: { equals: 'e2e-5-4-page' } }] }))) {
  await payload.create({
    collection: 'pages',
    locale: 'all',
    data: {
      site: 'gallery', kind: 'page', title: { en: 'E2E fixture page' }, slug: 'e2e-5-4-page',
      intro: { en: 'A fixture page for the gallery pages e2e spec.' },
      body: { en: 'First paragraph.\\n\\nSecond paragraph.' },
      _status: 'published',
    },
  })
}

writeFileSync(process.env.SEED_OUT, JSON.stringify({
  makerSlug: maker.slug, placePath: [java.slug, place.slug], pageSlug: 'e2e-5-4-page',
}))
await payload.destroy()
`

type Fixture = {
  readonly makerSlug: string
  readonly placePath: readonly string[]
  readonly pageSlug: string
}

/**
 * Writes the seed script to a scratch file at the repo root, runs it with `payload run`, and
 * answers its JSON — never committed (mirrors `tests/e2e/shop/payment.spec.ts`'s own pattern).
 */
function seed(): Fixture {
  const scriptPath = join(root, `.e2e-gallery-pages-seed-${randomBytes(4).toString('hex')}.ts`)
  const outPath = join(root, `.e2e-gallery-pages-seed-${randomBytes(4).toString('hex')}.json`)
  writeFileSync(scriptPath, SEED_SCRIPT)
  const windows = process.platform === 'win32'
  try {
    execFileSync('pnpm', ['--filter', '@engine/cms', 'payload', 'run', scriptPath], {
      cwd: root,
      encoding: 'utf8',
      shell: windows,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        NODE_ENV: 'development',
        SEED_OUT: outPath,
      },
      stdio: ['ignore', 'inherit', 'inherit'],
    })
    return JSON.parse(readFileSync(outPath, 'utf8')) as Fixture
  } finally {
    rmSync(scriptPath, { force: true })
    rmSync(outPath, { force: true })
  }
}

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
] as const

async function axeClean(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const found = violations.map(
    ({ id, impact, nodes }) => `${impact ?? 'unknown'} ${id}: ${nodes.map((n) => n.target).join()}`,
  )
  expect(found, label).toEqual([])
}

let fixture: Fixture
test.beforeAll(() => {
  fixture = seed()
})

test.describe('a maker page', () => {
  test('lists its available work before its sold one', async ({ page }) => {
    const response = await page.goto(`/makers/${fixture.makerSlug}`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E François Valentijn')
    const titles = await page.getByRole('heading', { level: 3 }).allTextContents()
    const available = titles.indexOf('E2E chart of Java')
    const sold = titles.indexOf('E2E sold chart')
    expect(available, 'available work found').toBeGreaterThanOrEqual(0)
    expect(sold, 'sold work found').toBeGreaterThanOrEqual(0)
    expect(available).toBeLessThan(sold)
  })

  for (const viewport of WIDTHS) {
    test(`is axe clean at ${viewport.width} px`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto(`/makers/${fixture.makerSlug}`)
      await axeClean(page, `maker page at ${viewport.width} px`)
    })
  }
})

test.describe('a place page', () => {
  test('lists its available work under its historical name', async ({ page }) => {
    const response = await page.goto(`/places/${fixture.placePath.join('/')}`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E Jakarta')
    await expect(page.getByText('E2E Batavia')).toBeVisible()
    await expect(page.getByRole('heading', { level: 3 })).toContainText('E2E chart of Java')
  })

  for (const viewport of WIDTHS) {
    test(`is axe clean at ${viewport.width} px`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto(`/places/${fixture.placePath.join('/')}`)
      await axeClean(page, `place page at ${viewport.width} px`)
    })
  }
})

test.describe('a published page', () => {
  test('renders its title and body', async ({ page }) => {
    const response = await page.goto(`/${fixture.pageSlug}`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E fixture page')
    await expect(page.getByText('First paragraph.')).toBeVisible()
  })

  for (const viewport of WIDTHS) {
    test(`is axe clean at ${viewport.width} px`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.goto(`/${fixture.pageSlug}`)
      await axeClean(page, `cms page at ${viewport.width} px`)
    })
  }
})
