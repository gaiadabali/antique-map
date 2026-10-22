/**
 * A page's built-in sections (`sites/shop/blocks/defaults`) → the rows the CMS's `layout` field
 * stores: the reverse of `../project`, so the seed writes a page that draws exactly as the built-in
 * one. A link goes back to what an editor would pick — a shop page by name, a section, or a web
 * address — through `surfaceOf`, which knows the shop's addresses in the seed's language.
 */
import type { BlockLink, ShopBlockVM } from '../blocks'

type Row = Record<string, unknown>

/** A built-in link's address → the shop page it names, or `null` for any other address. */
export type SurfaceOf = (href: string) => string | null

function linkRow(link: BlockLink | null, surfaceOf: SurfaceOf): Row {
  if (link === null) return {}
  if (link.href.startsWith('#')) return { to: 'anchor', anchor: link.href.slice(1) }
  const surface = surfaceOf(link.href)
  return surface === null ? { to: 'url', url: link.href } : { to: surface }
}

const lines = (values: readonly string[]) => values.map((text) => ({ text }))
const joined = (paragraphs: readonly string[]) => paragraphs.join('\n\n')

function rowOf(block: ShopBlockVM, surfaceOf: SurfaceOf): Row {
  const base = { blockType: block.type }
  switch (block.type) {
    case 'homeHero':
    case 'pageHero':
      return {
        ...base,
        ...(block.type === 'pageHero' ? { eyebrow: block.eyebrow } : {}),
        title: block.title,
        lede: block.lede,
        primaryLabel: block.primary?.label ?? null,
        primaryLink: linkRow(block.primary, surfaceOf),
        secondaryLabel: block.secondary?.label ?? null,
        secondaryLink: linkRow(block.secondary, surfaceOf),
        ...(block.type === 'homeHero' ? { signals: lines(block.signals) } : {}),
      }
    case 'categoryRail':
      return { ...base, title: block.title, linkLabel: block.linkLabel }
    case 'productRail':
      return {
        ...base,
        title: block.title,
        linkLabel: block.linkLabel,
        category: block.categoryId,
        emptyTitle: block.emptyTitle,
        emptyBody: block.emptyBody,
      }
    case 'steps':
      return { ...base, title: block.title, anchor: block.anchor, steps: block.steps }
    case 'story':
      return {
        ...base,
        title: block.title,
        lead: block.lead,
        body: block.body,
        facts: lines(block.facts),
        linkLabel: block.link?.label ?? null,
        link: linkRow(block.link, surfaceOf),
      }
    case 'originals':
      return {
        ...base,
        label: block.label,
        title: block.title,
        body: block.body,
        linkLabel: block.linkLabel,
      }
    case 'factStrip':
      return { ...base, facts: lines(block.facts) }
    case 'offer':
      return {
        ...base,
        anchor: block.anchor,
        eyebrow: block.eyebrow,
        title: block.title,
        body: block.body,
        terms: block.terms,
        linkLabel: block.link?.label ?? null,
        link: linkRow(block.link, surfaceOf),
        warm: block.warm,
      }
    case 'enquiry':
      return {
        ...base,
        anchor: block.anchor,
        eyebrow: block.eyebrow,
        title: block.title,
        body: block.body,
        talkFirst: block.talkFirst,
        whatsappMessage: block.whatsappMessage,
      }
    case 'partnerSignIn':
      return { ...base, eyebrow: block.eyebrow, title: block.title, body: block.body }
    case 'text':
      return { ...base, anchor: block.anchor, title: block.title, body: joined(block.paragraphs) }
    case 'imageText':
      // A built-in page holds no picture block: the seed never writes one.
      return { ...base, title: block.title }
    case 'faq':
      return {
        ...base,
        anchor: block.anchor,
        title: block.title,
        items: block.items.map((item) => ({
          question: item.question,
          answer: joined(item.paragraphs),
        })),
      }
    case 'callToAction':
      return {
        ...base,
        title: block.title,
        body: block.body,
        linkLabel: block.link?.label ?? null,
        link: linkRow(block.link, surfaceOf),
      }
    case 'storeDirectory':
      return { ...base, title: block.title, lede: block.lede, empty: block.empty }
  }
}

export function toCmsLayout(blocks: readonly ShopBlockVM[], surfaceOf: SurfaceOf): Row[] {
  return blocks.map((block) => rowOf(block, surfaceOf))
}

/**
 * The second language's rows on the first's structure: every array row keeps the `id` the first
 * save gave it, so the second save fills the same blocks' translated fields instead of making new
 * rows. Both layouts come from the same built-in page, so they match row for row.
 */
export function withIdsOf(saved: unknown, next: unknown): unknown {
  if (Array.isArray(next)) {
    const before = Array.isArray(saved) ? saved : []
    return next.map((row, index) => withIdsOf(before[index], row))
  }
  if (typeof next === 'object' && next !== null) {
    const before = (typeof saved === 'object' && saved !== null ? saved : {}) as Row
    const out: Row = {}
    for (const [key, value] of Object.entries(next as Row)) out[key] = withIdsOf(before[key], value)
    if (typeof before.id === 'string' || typeof before.id === 'number') out.id = before.id
    return out
  }
  return next
}
