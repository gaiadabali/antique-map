/**
 * The client preview's catalogue steps (`./index`, TASKS.md 28):
 *
 * - **product types** — the products filed under a subject category (Bali, Landscapes, …) move to
 *   the product type `prints`, "Mounted Art Prints"; a Bali or Botanicals subject becomes that
 *   theme on the product. The subject categories go to draft. Themes are also given by the
 *   product's English name. A product's own themes stay.
 * - **best sellers** — exactly seven: the Map of Bali Island 1724 first, then the first six
 *   products named after Bali, Java or Singapore; every other product's flag is cleared.
 *
 * Each write happens only where the record differs, so a second run writes nothing.
 */
import { fold } from '@engine/cms-core/import/vocabulary'

import { allOf, idOf, sameIds, writeOf, type Doc, type Step } from './shared'

export const SUBJECT_CATEGORIES = [
  'bali',
  'landscapes',
  'botanicals',
  'animals',
  'maps',
  'travel-posters',
] as const

/** A subject category whose products take a theme when they move. */
const SUBJECT_THEMES: Readonly<Record<string, string>> = { bali: 'Bali', botanicals: 'Botanicals' }

/** The themes a product's English name gives it. */
const NAME_THEMES: ReadonlyArray<readonly [string, RegExp]> = [
  ['Bali', /bali|ubud|lombok|denpasar|kuta|sanur/i],
  ['Java', /java|batavia|jakarta|bandung|surabaya|yogya/i],
  ['Singapore', /singapore/i],
  ['Botanicals', /flower|botanic|orchid|frangipani|leaf|plant|fruit|palm/i],
]

export const PRINTS = { slug: 'prints', en: 'Mounted Art Prints', id: 'Cetakan Seni Mounted' }
export const BEST_SELLER_FIRST = 'map-of-bali-island-1724'
export const BEST_SELLER_COUNT = 7

const englishOf = (value: unknown): string =>
  typeof value === 'string' ? value : ((value as { en?: string } | undefined)?.en ?? '')

/** The `prints` product type, relabelled, published and on the wall-decor list. */
async function ensurePrints(step: Step, categories: Doc[]): Promise<number> {
  let prints = categories.find((each) => each.slug === PRINTS.slug)
  if (!prints) {
    prints = (await step.payload.create({
      collection: 'categories',
      ...writeOf(step),
      data: { label: 'Prints', slug: PRINTS.slug } as never,
    })) as unknown as Doc
  }
  const due =
    englishOf(prints.label) !== PRINTS.en ||
    prints.wallDecor !== true ||
    prints._status !== 'published'
  if (due) {
    await step.payload.update({
      collection: 'categories',
      id: prints.id,
      ...writeOf(step),
      data: { label: PRINTS.en, wallDecor: true, _status: 'published' } as never,
    })
  }
  const inId = (await step.payload.findByID({
    collection: 'categories',
    id: prints.id,
    ...writeOf(step, 'id'),
    fallbackLocale: false as never,
    depth: 0,
  })) as unknown as Doc
  if (englishOf(inId.label) !== PRINTS.id) {
    await step.payload.update({
      collection: 'categories',
      id: prints.id,
      ...writeOf(step, 'id'),
      data: { label: PRINTS.id } as never,
    })
  }
  return prints.id
}

export type CatalogueReport = { moved: number; themed: number; subjectsDrafted: number }

export async function seedProductTypes(step: Step): Promise<CatalogueReport> {
  const report: CatalogueReport = { moved: 0, themed: 0, subjectsDrafted: 0 }
  const categories = await allOf(step, 'categories')
  const printsId = await ensurePrints(step, categories)
  const subjects = new Map<number, string>()
  for (const each of categories) {
    if ((SUBJECT_CATEGORIES as readonly unknown[]).includes(each.slug)) {
      subjects.set(each.id, String(each.slug))
    }
  }
  const themes = await allOf(step, 'themes')
  const themeId = (label: string) =>
    themes.find((each) => fold(englishOf(each.label)) === fold(label))?.id ?? null
  for (const product of await allOf(step, 'products')) {
    const own = ((product.themes ?? []) as unknown[])
      .map(idOf)
      .filter((each): each is number => each !== null)
    const next = new Set(own)
    const subject = subjects.get(idOf(product.category) ?? -1)
    const wanted = [
      ...(subject && SUBJECT_THEMES[subject] ? [SUBJECT_THEMES[subject]] : []),
      ...NAME_THEMES.filter(([, re]) => re.test(englishOf(product.name))).map(([label]) => label),
    ]
    for (const label of wanted) {
      const id = themeId(label)
      if (id !== null) next.add(id)
    }
    const themesNext = [...next]
    const data: Record<string, unknown> = {}
    if (subject) data.category = printsId
    if (!sameIds(own, themesNext)) data.themes = themesNext
    if (Object.keys(data).length === 0) continue
    await step.payload.update({ collection: 'products', id: product.id, ...writeOf(step), data })
    if (subject) report.moved += 1
    if (data.themes) report.themed += 1
  }
  for (const [id] of subjects) {
    const category = categories.find((each) => each.id === id)
    if (category?._status === 'draft') continue
    await step.payload.update({
      collection: 'categories',
      id,
      ...writeOf(step),
      data: { _status: 'draft' } as never,
    })
    report.subjectsDrafted += 1
  }
  return report
}

export type BestSellerReport = { count: number; changed: number }

export async function seedBestSellers(step: Step): Promise<BestSellerReport> {
  const products = await allOf(step, 'products')
  const first = products.find((each) => each.slug === BEST_SELLER_FIRST)
  const rest = products.filter(
    (each) => each !== first && /bali|java|singapore/i.test(englishOf(each.name)),
  )
  const picks = new Set(
    [...(first ? [first] : []), ...rest]
      .slice(0, first ? BEST_SELLER_COUNT : BEST_SELLER_COUNT - 1)
      .map((each) => each.id),
  )
  let changed = 0
  for (const product of products) {
    const wanted = picks.has(product.id)
    if ((product.bestSeller === true) === wanted) continue
    await step.payload.update({
      collection: 'products',
      id: product.id,
      ...writeOf(step),
      data: { bestSeller: wanted } as never,
    })
    changed += 1
  }
  return { count: picks.size, changed }
}
