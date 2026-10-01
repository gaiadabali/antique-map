// TASKS.md 5.4.b–c — CONVENTIONS.md §12's rendering rules, each proven by a planted violation that
// the repository's own ESLint config (eslint.config.mjs) refuses by file and passes once it is
// gone. Nothing is written to disk: `lintText` lints the text as if it lived at that path.
import { join } from 'node:path'

import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'

const repoRoot = process.cwd()
/** One ESLint per file, whose first lint loads the config: generous on a loaded machine. */
const LOADED = { timeout: 60_000 }
let eslint
beforeAll(() => {
  eslint = new ESLint({ cwd: repoRoot })
}, 60_000)

/** The engine fences `code` breaks, at `path` (from the repository root). */
async function fencesAt(path, code) {
  const [result] = await eslint.lintText(code, { filePath: join(repoRoot, path) })
  return result.messages.map((m) => m.ruleId).filter((id) => id?.startsWith('fences/'))
}

const SITE = 'engine/apps/gallery/src/app/(site)/[locale]'
const LAYOUTS = [`${SITE}/layout.tsx`, 'engine/apps/emporium/src/app/(site)/[locale]/layout.tsx']
const THE_LAYOUT = 'export const instant = false\nexport function generateStaticParams() {}\n'

describe('one route segment config (5.4.b)', LOADED, () => {
  it.each([
    [`${SITE}/page.tsx`, "export const dynamic = 'force-dynamic'\n"],
    [`${SITE}/page.tsx`, 'export const revalidate = 60\n'],
    [`${SITE}/page.tsx`, "export const fetchCache = 'force-no-store'\n"],
    [`${SITE}/product/[id]/page.tsx`, "export const prefetch = 'partial'\n"],
    [`${SITE}/product/[id]/page.tsx`, 'export const instant = false\n'], // any segment but the layout
    [`${SITE}/product/[id]/page.tsx`, 'export function generateStaticParams() {}\n'],
    [`${SITE}/product/[id]/page.tsx`, 'export const dynamicParams = false\n'],
    [
      'engine/apps/emporium/src/app/(site)/[locale]/cart/page.tsx',
      "export { runtime } from './x'\n",
    ],
    ['engine/apps/gallery/src/app/api/x/og/[...path]/route.ts', 'export const maxDuration = 5\n'],
    ['engine/apps/gallery/src/app/api/health/route.ts', "export const preferredRegion = 'auto'\n"],
    [LAYOUTS[0], 'export const instant = true\n'],
    [LAYOUTS[1], 'export let instant = false\n'],
    [LAYOUTS[0], "export const dynamic = 'error'\n"],
    [LAYOUTS[1], "export { instant } from './config'\n"],
  ])('refuses %s: %s', async (path, code) => {
    expect(await fencesAt(path, code)).toEqual(['fences/segment-config'])
  })

  it.each([
    [LAYOUTS[0], THE_LAYOUT],
    [LAYOUTS[1], THE_LAYOUT],
    [
      'engine/apps/gallery/src/app/(payload)/admin/[[...segments]]/page.tsx',
      'export const dynamic = 1\n',
    ],
    [`${SITE}/page.tsx`, 'export const metadata = {}\nexport default function Page() {}\n'],
  ])('passes %s', async (path, code) => {
    expect(await fencesAt(path, code)).toEqual([])
  })
})

describe(
  'no storefront link prefetches: next/link in the link primitive alone (5.4.c)',
  LOADED,
  () => {
    const LINK = "import Link from 'next/link'\n"
    it.each([
      [`${SITE}/page.tsx`, LINK],
      ['engine/apps/emporium/src/components/card.tsx', LINK],
      ['engine/packages/ui/src/cards/item-card.tsx', LINK],
      ['engine/packages/ui/src/cards/item-card.tsx', "export { default } from 'next/link'\n"],
      ['engine/packages/view-models/src/x.tsx', "const L = () => import('next/link')\n"],
      [
        'engine/packages/ui/src/cards/item-card.tsx',
        "import Link from 'next/dist/client/app-dir/link'\n",
      ],
    ])('refuses %s: %s', async (path, code) => {
      expect(await fencesAt(path, code)).toEqual(['fences/no-next-link'])
    })

    it.each([
      'engine/packages/ui/src/primitives/link.tsx',
      'engine/packages/cms/src/admin/nav.tsx',
      'engine/apps/gallery/src/app/(payload)/admin/[[...segments]]/page.tsx',
    ])('passes %s', async (path) => {
      expect(await fencesAt(path, LINK)).toEqual([])
    })
  },
)

describe('no next/form and no router prefetch, anywhere (5.4.c)', LOADED, () => {
  it.each([
    `${SITE}/search/page.tsx`,
    'engine/packages/ui/src/primitives/search-form.tsx',
    'engine/packages/cms/src/admin/search.tsx',
  ])('refuses next/form in %s', async (path) => {
    expect(await fencesAt(path, "import Form from 'next/form'\n")).toEqual(['fences/no-next-form'])
  })

  it.each([
    'const router = useRouter()\nrouter.prefetch("/en/catalogue")\n',
    'useRouter().prefetch("/en/catalogue")\n',
    'const { prefetch } = useRouter()\n',
  ])('refuses %s', async (code) => {
    const path = 'engine/packages/ui/src/primitives/nav.tsx'
    expect(await fencesAt(path, code)).toContain('fences/no-router-prefetch')
  })

  it('passes a plain <form> and a router that only pushes', async () => {
    const code =
      'const router = useRouter()\nrouter.push("/en")\nexport const f = <form method="post" />\n'
    expect(await fencesAt(`${SITE}/page.tsx`, code)).toEqual([])
  })
})

describe('the fences hold however the import or the prefetch is spelled (qa S3)', LOADED, () => {
  const CARD = 'engine/packages/ui/src/cards/item-card.tsx'
  it.each([
    [CARD, "import Link from 'next/link.js'\n", 'no-next-link'],
    [CARD, "import Link from 'next/dist/esm/client/app-dir/link.js'\n", 'no-next-link'],
    [CARD, "import Link from 'next/dist/client/link'\n", 'no-next-link'],
    [CARD, "const Link = require('next/link')\n", 'no-next-link'],
    [
      'engine/packages/ui/src/primitives/other-link.tsx',
      "import Link from 'next/link'\n",
      'no-next-link',
    ],
    [
      'engine/packages/ui/src/primitives/Link.tsx',
      "import Link from 'next/link'\n",
      'no-next-link',
    ],
    [CARD, "import Form from 'next/form.js'\n", 'no-next-form'],
    [CARD, "import Form from 'next/dist/esm/client/form.js'\n", 'no-next-form'],
  ])('refuses %s: %s', async (path, code, rule) => {
    expect(await fencesAt(path, code)).toEqual([`fences/${rule}`])
  })

  it.each([
    'import * as nav from "next/navigation"\nnav.useRouter().prefetch("/en")\n', // namespaced
    'import { useRouter as r } from "next/navigation"\nconst go = r()\ngo.prefetch("/en")\n', // aliased
    'const router = props.router\nconst { prefetch } = router\n', // destructured from a variable
    'const pre = useRouter().prefetch\n', // pulled off, never called here
    'const pre = useRouter()["prefetch"]\n', // computed
    'const { ["prefetch"]: pre } = useRouter()\n',
  ])('refuses %s', async (code) => {
    const found = await fencesAt(`${SITE}/page.tsx`, code)
    expect(found.length).toBeGreaterThan(0)
    expect(new Set(found)).toEqual(new Set(['fences/no-router-prefetch']))
  })

  it('passes a JSX prefetch={false} and an object literal key', async () => {
    const code = 'export const a = <A prefetch={false} />\nexport const o = { prefetch: false }\n'
    expect(await fencesAt(`${SITE}/page.tsx`, code)).toEqual([])
  })

  it.each([
    'export const { dynamic } = config\n',
    'export const [runtime] = config\n',
    'export const { a: { revalidate } } = config\n',
  ])('refuses a destructured segment config export: %s', async (code) => {
    expect(await fencesAt(`${SITE}/page.tsx`, code)).toEqual(['fences/segment-config'])
  })

  it('refuses a destructured instant, even on the locale layout', async () => {
    expect(await fencesAt(LAYOUTS[0], 'export const { instant } = { instant: false }\n')).toEqual([
      'fences/segment-config',
    ])
  })
})

describe(
  'no-router-prefetch across engine/, Reflect.get and a const key (qa re-gate L4)',
  LOADED,
  () => {
    it.each([
      ['engine/packages/cms/src/admin/nav.tsx', 'useRouter().prefetch("/admin")\n'],
      [`${SITE}/page.tsx`, "Reflect.get(useRouter(), 'prefetch')('/en')\n"],
      [`${SITE}/page.tsx`, "const k = 'prefetch'\nconst r = useRouter()\nr[k]('/en')\n"],
    ])('refuses %s: %s', async (path, code) => {
      expect(new Set(await fencesAt(path, code))).toEqual(new Set(['fences/no-router-prefetch']))
    })

    it('passes a computed key that is not the const prefetch', async () => {
      const code = "let k = 'prefetch'\nconst r = useRouter()\nconst j = 'push'\nr[j]('/en')\n"
      expect(await fencesAt(`${SITE}/page.tsx`, code)).toEqual([])
    })
  },
)
