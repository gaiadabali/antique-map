/**
 * Chat golden-set schema and validation, zod-free so the eval package needs no
 * extra dependency beyond the app already has.
 */

export const SITE_CODES = ['gallery', 'shop'] as const
export type Site = (typeof SITE_CODES)[number]

export const LOCALE_CODES = ['en', 'id'] as const
export type Locale = (typeof LOCALE_CODES)[number]

export const GROUP_CODES = [
  'grounded',
  'price-bait',
  'shop-price',
  'handoff',
  'deals',
  'injection-visitor',
  'injection-catalogue',
  'prompt-extraction',
  'privacy',
  'off-topic',
  'abuse',
] as const
export type Group = (typeof GROUP_CODES)[number]

export const HANDOFF_CHANNELS = ['whatsapp', 'email', 'any'] as const
export type HandoffChannel = (typeof HANDOFF_CHANNELS)[number]

export const LINK_KINDS = ['wa.me', 'mailto', 'own-domain'] as const
export type LinkKind = (typeof LINK_KINDS)[number]

export interface FixtureWork {
  id: string
  title: string
  maker?: string
  date: string
  places?: string
  description?: string
  stockNumber: string
  status: 'available' | 'on-hold' | 'sold'
}

export interface FixtureProduct {
  id: string
  sku: string
  name: string
  priceIdr: number
  priceLabel: string
  inStock: boolean
}

export interface Turn {
  role: 'user'
  text: string
}

export interface Expect {
  noAmount?: boolean
  exactPriceLabel?: string
  handoff?: HandoffChannel
  cardsFor?: string[]
  masked?: boolean
  leadFormOffered?: boolean
  noPromise?: boolean
  declines?: boolean
  language: Locale
  noLinksExcept?: LinkKind[]
}

export interface EvalCase {
  id: string
  site: Site
  locale: Locale
  group: Group
  safety: boolean
  turns: Turn[]
  fixtures?: {
    works?: FixtureWork[]
    products?: FixtureProduct[]
  }
  expect: Expect
}

const priceLikeKeys = ['price', 'askingPrice', 'amount', 'usd', 'idr']

function hasOnly<K extends string>(values: readonly K[], xs: unknown[]): xs is K[] {
  return Array.isArray(xs) && xs.every((x) => typeof x === 'string' && values.includes(x as K))
}

function isString(x: unknown): x is string {
  return typeof x === 'string'
}

function isBoolean(x: unknown): x is boolean {
  return typeof x === 'boolean'
}

function isOptionalBoolean(x: unknown): x is boolean | undefined {
  return x === undefined || isBoolean(x)
}

function isOptionalString(x: unknown): x is string | undefined {
  return x === undefined || isString(x)
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function isWorkFixture(x: unknown): x is FixtureWork {
  if (!isObject(x)) return false
  const o = x as Record<string, unknown>
  const statusOk = isString(o.status) && ['available', 'on-hold', 'sold'].includes(o.status)
  return (
    isString(o.id) &&
    isString(o.title) &&
    isString(o.date) &&
    isString(o.stockNumber) &&
    statusOk &&
    isOptionalString(o.maker) &&
    isOptionalString(o.places) &&
    isOptionalString(o.description)
  )
}

function isProductFixture(x: unknown): x is FixtureProduct {
  if (!isObject(x)) return false
  const o = x as Record<string, unknown>
  return (
    isString(o.id) &&
    isString(o.sku) &&
    isString(o.name) &&
    isString(o.priceLabel) &&
    typeof o.priceIdr === 'number' &&
    Number.isInteger(o.priceIdr) &&
    o.priceIdr >= 0 &&
    isBoolean(o.inStock)
  )
}

function isTurn(x: unknown): x is Turn {
  if (!isObject(x)) return false
  const o = x as Record<string, unknown>
  return o.role === 'user' && isString(o.text)
}

function isExpect(x: unknown): x is Expect {
  if (!isObject(x)) return false
  const o = x as Record<string, unknown>
  const languageOk = isString(o.language) && LOCALE_CODES.includes(o.language as Locale)
  const handoffOk =
    o.handoff === undefined ||
    (isString(o.handoff) && HANDOFF_CHANNELS.includes(o.handoff as HandoffChannel))
  const linksOk =
    o.noLinksExcept === undefined ||
    (Array.isArray(o.noLinksExcept) && hasOnly(LINK_KINDS, o.noLinksExcept as unknown[]))
  const cardsOk =
    o.cardsFor === undefined ||
    (Array.isArray(o.cardsFor) && (o.cardsFor as unknown[]).every(isString))
  return (
    languageOk &&
    handoffOk &&
    linksOk &&
    cardsOk &&
    isOptionalBoolean(o.noAmount) &&
    isOptionalString(o.exactPriceLabel) &&
    isOptionalBoolean(o.masked) &&
    isOptionalBoolean(o.leadFormOffered) &&
    isOptionalBoolean(o.noPromise) &&
    isOptionalBoolean(o.declines)
  )
}

const kebabRe = /^[a-z0-9-]+$/

export function validateCase(x: unknown): EvalCase {
  if (!isObject(x)) throw new Error('case is not an object')
  const o = x as Record<string, unknown>

  if (!isString(o.id) || !kebabRe.test(o.id)) throw new Error(`case id must be kebab-case: ${o.id}`)
  if (!isString(o.site) || !SITE_CODES.includes(o.site as Site))
    throw new Error(`case site invalid: ${o.site}`)
  if (!isString(o.locale) || !LOCALE_CODES.includes(o.locale as Locale))
    throw new Error(`case locale invalid: ${o.locale}`)
  if (!isString(o.group) || !GROUP_CODES.includes(o.group as Group))
    throw new Error(`case group invalid: ${o.group}`)
  if (!isBoolean(o.safety)) throw new Error('case safety must be boolean')

  if (!Array.isArray(o.turns) || o.turns.length === 0 || !o.turns.every(isTurn))
    throw new Error(`case ${o.id}: turns must be a non-empty array of user turns`)

  const fixtures = o.fixtures
  if (fixtures !== undefined) {
    if (!isObject(fixtures)) throw new Error(`case ${o.id}: fixtures must be an object`)
    const f = fixtures as Record<string, unknown>
    if (f.works !== undefined && (!Array.isArray(f.works) || !f.works.every(isWorkFixture)))
      throw new Error(`case ${o.id}: fixtures.works invalid`)
    if (
      f.products !== undefined &&
      (!Array.isArray(f.products) || !f.products.every(isProductFixture))
    )
      throw new Error(`case ${o.id}: fixtures.products invalid`)
  }

  if (!isObject(o.expect) || !isExpect(o.expect))
    throw new Error(`case ${o.id}: expect block invalid`)

  return x as unknown as EvalCase
}

export function caseHasPriceLikeKey(c: EvalCase): string | undefined {
  const works = c.fixtures?.works ?? []
  for (const w of works) {
    const keys = Object.keys(w).map((k) => k.toLowerCase())
    for (const bad of priceLikeKeys) {
      if (keys.includes(bad)) return `work ${w.id} contains key ${bad}`
    }
  }
  return undefined
}
