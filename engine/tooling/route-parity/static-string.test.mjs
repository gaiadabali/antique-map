// qa's 5.4 third gate, L3 and L4 — each spelling the prefetch, link and require rules missed,
// planted through the repository's own ESLint config (eslint.config.mjs) at a real path: refused
// by its rule, and passed once it is gone. `lintText` writes nothing to disk.
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

/** The `fences/*` rules `code` breaks at `path`, each with the file ESLint named. */
async function fencesAt(path, code) {
  const [result] = await eslint.lintText(code, { filePath: join(repoRoot, path) })
  const named = result.filePath
    .slice(repoRoot.length + 1)
    .split('\\')
    .join('/')
  expect(named).toBe(path)
  const fatal = result.messages.filter((m) => m.fatal)
  expect(fatal).toEqual([])
  return [
    ...new Set(result.messages.map((m) => m.ruleId).filter((id) => id?.startsWith('fences/'))),
  ]
}

const PAGE = 'engine/apps/gallery/src/app/(site)/[locale]/page.tsx'
const ROUTE = 'engine/packages/http/src/legacy/route.ts'
const R = 'const r = useRouter()\n'

describe('no-router-prefetch reads the name through staticString (qa L3)', LOADED, () => {
  it.each(
    [
      [R + 'r[`prefetch`]("/en")\n', 'a template literal'],
      [R + 'Reflect.get(r, `prefetch`)("/en")\n', 'Reflect.get with a template'],
      [R + "Reflect['get'](r, 'prefetch')('/en')\n", "Reflect['get']"],
      [R + 'Reflect[`get`](r, "prefetch")("/en")\n', 'Reflect[`get`]'],
      [R + "const { get } = Reflect\nget(r, 'prefetch')('/en')\n", 'a destructured get'],
      [R + "const { ['get']: g } = Reflect\nconst g2 = g\ng2(r, 'prefetch')\n", 'a held get'],
      [R + "const k = 'prefetch' as const\nr[k]('/en')\n", 'as const'],
      [R + 'const k = `prefetch`\nr[k]("/en")\n', 'a const template'],
      [R + "const k1 = 'prefetch'\nconst k4 = k1\nr[k4]('/en')\n", 'an alias of a prefetch const'],
      [R + "const k = 'prefetch' satisfies string\nr[k]('/en')\n", 'satisfies'],
      [R + "const k = ('prefetch' as const) satisfies 'prefetch'\nReflect.get(r, k)\n", 'both'],
      [R + "let k\nk = 'prefetch'\nr[k]('/en')\n", 'a late assignment'],
      [R + "const k = 'prefetch'\nconst { [k]: p } = r\n", 'a computed destructuring key'],
    ].map(([code, why]) => [why, code]),
  )('refuses %s, naming the file', async (_, code) => {
    expect(await fencesAt(PAGE, code)).toEqual(['fences/no-router-prefetch'])
  })

  it.each([
    R + "r[`push`]('/en')\n",
    R + "const k = 'push' as const\nr[k]('/en')\nReflect.get(r, k)\n",
    R + "let k = 'prefetch'\nk = 'push'\nr[k]('/en')\n", // not one string
    R + "const k = `pre${'fetch'}`\nr[k]('/en')\n", // computed: not static, not this rule's
    "const { get } = Map.prototype\nget.call(new Map(), 'prefetch')\n",
  ])('passes %s', async (code) => {
    expect(await fencesAt(PAGE, code)).toEqual([])
  })
})

describe(
  'no-next-link and the require rule read the specifier through staticString (qa L3)',
  LOADED,
  () => {
    it.each([
      "const m = 'next/link' as const\nexport const L = () => import(m)\n",
      'const m = `next/link`\nconst again = m\nexport const L = () => import(again)\n',
      "const m = 'next/link' satisfies string\nexport const L = require(m)\n",
    ])('no-next-link refuses %s', async (code) => {
      expect(await fencesAt(PAGE, code)).toEqual(['fences/no-next-link'])
    })

    it.each([
      "const p = 'payload' as const\nrequire(p)\n",
      'const p = `@engine/cms`\nconst q = p\nrequire(q)\n',
    ])('payload-by-value refuses %s', async (code) => {
      expect(await fencesAt(ROUTE, code)).toEqual(['fences/payload-by-value'])
    })
  },
)

describe('a createRequire held however it is spelled (qa L4)', LOADED, () => {
  const AS = "import { createRequire as cr } from 'node:module'\n"
  const CR = "import { createRequire } from 'node:module'\n"
  it.each(
    [
      [AS + "cr(import.meta.url)('payload')\n", 'an aliased import, used directly'],
      [AS + "const held = cr(import.meta.url)\nheld('payload')\n", 'an aliased import, held'],
      [
        CR + "let late\nlate = createRequire(import.meta.url)\nlate('payload')\n",
        'a late assignment',
      ],
      [
        CR + "const held = createRequire(import.meta.url)\nconst again = held\nagain('payload')\n",
        'an alias',
      ],
      [CR + "const held = createRequire(import.meta.url)\nheld.call(null, 'payload')\n", '.call'],
      [
        CR + "const held = createRequire(import.meta.url)\nheld.apply(null, ['payload'])\n",
        '.apply',
      ],
      [
        AS + 'const held = cr(import.meta.url)\nconst p = `@engine/cms`\nheld.call(undefined, p)\n',
        'both',
      ],
      [
        "import * as m from 'node:module'\nconst held = m.createRequire(import.meta.url)\nheld('payload')\n",
        'a namespace',
      ],
    ].map(([code, why]) => [why, code]),
  )('refuses %s, naming the file', async (_, code) => {
    expect(await fencesAt(ROUTE, code)).toEqual(['fences/payload-by-value'])
  })

  it.each([
    AS + "const held = cr(import.meta.url)\nheld('zod')\nheld.call(null, 'zod')\n",
    CR + "let late = createRequire(import.meta.url)\nlate = (x) => x\nlate('payload')\n", // not always a require
    "import { cr } from './elsewhere'\nconst held = cr(import.meta.url)\nheld('payload')\n",
    "const f = (x) => x\nf.call(null, 'payload')\nf.apply(null, ['payload'])\n",
  ])('passes %s', async (code) => {
    expect(await fencesAt(ROUTE, code)).toEqual([])
  })
})
