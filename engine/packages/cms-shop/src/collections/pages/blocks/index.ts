/**
 * The blocks a shop page is built from, in the order the admin's "Add block" menu lists them:
 * the home's sections, the partnership page's, then the general ones any page may use.
 *
 * **Which blocks a page is offered depends on its kind** (the plan's §3.4; TASKS.md 27.1.c): the
 * home (address `home`) takes the home's blocks and the general ones, the partnership page
 * (`partnership`) the partnership's and the general ones, any other shop page the general ones
 * only. `filterOptions` both narrows the admin's menu and refuses a save that holds a block its
 * page may not have (Payload validates the field against it), on every write path.
 */
import type { Block, BlocksField } from 'payload'

import { recordsCarrySite } from '../../../site'

import { CONTENT_BLOCKS } from './content'
import { HOME_BLOCKS } from './home'
import { PARTNERSHIP_BLOCKS } from './partnership'

export { RAIL_SOURCES, railSourceOf, type RailSource } from './rail-source'

export const SHOP_BLOCKS: Block[] = [...HOME_BLOCKS, ...PARTNERSHIP_BLOCKS, ...CONTENT_BLOCKS]

export const SHOP_PAGE_KINDS = ['home', 'partnership', 'general'] as const
export type ShopPageKind = (typeof SHOP_PAGE_KINDS)[number]

/** A shop page's kind, from its address: the home and the partnership page are named ones. */
export function shopPageKind(slug: unknown): ShopPageKind {
  return slug === 'home' || slug === 'partnership' ? slug : 'general'
}

const slugsOf = (blocks: readonly Block[]) => blocks.map((block) => block.slug)
const GENERAL = slugsOf(CONTENT_BLOCKS)

export const BLOCKS_BY_KIND: Readonly<Record<ShopPageKind, readonly string[]>> = {
  home: [...slugsOf(HOME_BLOCKS), ...GENERAL],
  partnership: [...slugsOf(PARTNERSHIP_BLOCKS), ...GENERAL],
  general: GENERAL,
}

type PageKeys = { site?: unknown; slug?: unknown }
type BlocksFilterOptions = Extract<
  NonNullable<BlocksField['filterOptions']>,
  (...args: never[]) => unknown
>

/**
 * The block slugs a page may hold: a shop page's by its kind; a gallery page has no blocks. A
 * write that leaves out the site or the address (a Local API update of one locale's sections)
 * is judged by the stored page's.
 */
export const blocksForPage: BlocksFilterOptions = async ({ data, id, req }) => {
  // In the shop's own CMS every page is the shop's: its pages carry no `site` (`../../../site`).
  const shopOnly =
    Boolean(req?.payload?.collections?.pages) && !recordsCarrySite(req.payload, 'pages')
  let page = (data ?? {}) as PageKeys
  const unknown = (!shopOnly && page.site === undefined) || page.slug === undefined
  if (unknown && id !== undefined && id !== null) {
    const stored = (await req.payload.findByID({
      collection: 'pages',
      id,
      depth: 0,
      draft: true,
      select: shopOnly ? { slug: true } : { site: true, slug: true },
      overrideAccess: true,
      disableErrors: true,
      req,
    })) as PageKeys | null
    page = { site: page.site ?? stored?.site, slug: page.slug ?? stored?.slug }
  }
  if (!shopOnly && page.site !== 'shop') return true
  return [...BLOCKS_BY_KIND[shopPageKind(page.slug)]]
}
