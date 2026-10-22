/**
 * A shop page's stored blocks → the sections a renderer draws (`./blocks`). Pure: the caller hands
 * in the rows Payload answered (one locale, pictures populated) and how a shop page's address is
 * built, so a test drives it with plain objects. A block missing what it cannot be drawn without
 * (a title, a picture) is left out rather than drawn half; an unknown block type is skipped, so a
 * block added to the CMS before its renderer never breaks a page.
 */
import { imageOf } from '../catalogue/images'
import type { BlockLink, ShopBlockVM } from './blocks'

/** Builds a shop page's address in the visitor's language: `href('browse')` → `/id/belanja`. */
export type SurfaceHref = (surface: string) => string

type Row = Record<string, unknown>

const SURFACES = new Set([
  'home',
  'browse',
  'collection',
  'partnership',
  'stores',
  'search',
  'tracking',
])

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null

/** Paragraphs: a blank line splits them, each trimmed, empties dropped. */
export function paragraphsOf(value: unknown): readonly string[] {
  if (typeof value !== 'string') return []
  return value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '')
}

const linesOf = (value: unknown): readonly string[] =>
  Array.isArray(value)
    ? value.map((row) => text((row as Row)?.text)).filter((line): line is string => line !== null)
    : []

const rowsOf = (value: unknown): readonly Row[] =>
  Array.isArray(value)
    ? value.filter((row): row is Row => typeof row === 'object' && row !== null)
    : []

/** A stored link group → its address, or `null` when it names nothing usable. */
export function hrefOf(
  value: unknown,
  href: SurfaceHref,
): { href: string; external: boolean } | null {
  const link = (value ?? {}) as Row
  const to = link.to
  if (to === 'anchor') {
    const anchor = text(link.anchor)
    return anchor && /^[a-z0-9-]+$/.test(anchor) ? { href: `#${anchor}`, external: false } : null
  }
  if (to === 'url') {
    const url = text(link.url)
    if (url === null) return null
    if (url.startsWith('/')) return url.startsWith('//') ? null : { href: url, external: false }
    return /^(https:\/\/|mailto:)/.test(url)
      ? { href: url, external: url.startsWith('https:') }
      : null
  }
  return typeof to === 'string' && SURFACES.has(to) ? { href: href(to), external: false } : null
}

/** A label and its link together, or `null` when either is missing. */
function linkOf(label: unknown, value: unknown, href: SurfaceHref): BlockLink | null {
  const words = text(label)
  const target = hrefOf(value, href)
  return words && target ? { label: words, ...target } : null
}

const anchorOf = (value: unknown): string | null => {
  const anchor = text(value)
  return anchor && /^[a-z0-9-]+$/.test(anchor) ? anchor : null
}

function blockOf(row: Row, id: string, href: SurfaceHref): ShopBlockVM | null {
  const title = text(row.title)
  switch (row.blockType) {
    case 'homeHero':
      return title === null
        ? null
        : {
            type: 'homeHero',
            id,
            title,
            lede: text(row.lede),
            primary: linkOf(row.primaryLabel, row.primaryLink, href),
            secondary: linkOf(row.secondaryLabel, row.secondaryLink, href),
            signals: linesOf(row.signals),
          }
    case 'categoryRail':
      return { type: 'categoryRail', id, title: title ?? '', linkLabel: text(row.linkLabel) }
    case 'productRail': {
      const category = row.category
      const categoryId =
        typeof category === 'number'
          ? category
          : typeof (category as Row | null)?.id === 'number'
            ? ((category as Row).id as number)
            : null
      return {
        type: 'productRail',
        id,
        title: title ?? '',
        linkLabel: text(row.linkLabel),
        categoryId,
        emptyTitle: text(row.emptyTitle) ?? '',
        emptyBody: text(row.emptyBody) ?? '',
      }
    }
    case 'steps': {
      const steps = rowsOf(row.steps).flatMap((step) => {
        const stepTitle = text(step.title)
        return stepTitle ? [{ title: stepTitle, body: text(step.body) }] : []
      })
      return title === null || steps.length === 0
        ? null
        : { type: 'steps', id, anchor: anchorOf(row.anchor), title, steps }
    }
    case 'story':
      return title === null
        ? null
        : {
            type: 'story',
            id,
            title,
            lead: text(row.lead),
            body: text(row.body),
            facts: linesOf(row.facts),
            link: linkOf(row.linkLabel, row.link, href),
          }
    case 'originals':
      return title === null
        ? null
        : {
            type: 'originals',
            id,
            label: text(row.label),
            title,
            body: text(row.body),
            linkLabel: text(row.linkLabel) ?? '',
          }
    case 'pageHero':
      return title === null
        ? null
        : {
            type: 'pageHero',
            id,
            eyebrow: text(row.eyebrow),
            title,
            lede: text(row.lede),
            primary: linkOf(row.primaryLabel, row.primaryLink, href),
            secondary: linkOf(row.secondaryLabel, row.secondaryLink, href),
          }
    case 'factStrip': {
      const facts = linesOf(row.facts)
      return facts.length === 0 ? null : { type: 'factStrip', id, facts }
    }
    case 'offer':
      return title === null
        ? null
        : {
            type: 'offer',
            id,
            anchor: anchorOf(row.anchor),
            eyebrow: text(row.eyebrow),
            title,
            body: text(row.body),
            terms: rowsOf(row.terms).flatMap((term) => {
              const label = text(term.label)
              const value = text(term.value)
              return label && value ? [{ label, value }] : []
            }),
            link: linkOf(row.linkLabel, row.link, href),
            warm: row.warm === true,
          }
    case 'enquiry':
      return title === null
        ? null
        : {
            type: 'enquiry',
            id,
            anchor: anchorOf(row.anchor) ?? 'apply',
            eyebrow: text(row.eyebrow),
            title,
            body: text(row.body),
            talkFirst: text(row.talkFirst),
            whatsappMessage: text(row.whatsappMessage),
          }
    case 'partnerSignIn':
      return title === null
        ? null
        : { type: 'partnerSignIn', id, eyebrow: text(row.eyebrow), title, body: text(row.body) }
    default:
      return contentBlockOf(row, id, title, href)
  }
}

/** The general blocks (`content.ts` in the CMS). */
function contentBlockOf(
  row: Row,
  id: string,
  title: string | null,
  href: SurfaceHref,
): ShopBlockVM | null {
  switch (row.blockType) {
    case 'text': {
      const paragraphs = paragraphsOf(row.body)
      return paragraphs.length === 0
        ? null
        : { type: 'text', id, anchor: anchorOf(row.anchor), title, paragraphs }
    }
    case 'imageText': {
      const image = imageOf(row.image)
      return title === null || image === null
        ? null
        : {
            type: 'imageText',
            id,
            anchor: anchorOf(row.anchor),
            image,
            side: row.side === 'right' ? 'right' : 'left',
            eyebrow: text(row.eyebrow),
            title,
            paragraphs: paragraphsOf(row.body),
            link: linkOf(row.linkLabel, row.link, href),
          }
    }
    case 'faq': {
      const items = rowsOf(row.items).flatMap((item) => {
        const question = text(item.question)
        const paragraphs = paragraphsOf(item.answer)
        return question && paragraphs.length > 0 ? [{ question, paragraphs }] : []
      })
      return items.length === 0
        ? null
        : { type: 'faq', id, anchor: anchorOf(row.anchor), title, items }
    }
    case 'callToAction':
      return title === null
        ? null
        : {
            type: 'callToAction',
            id,
            title,
            body: text(row.body),
            link: linkOf(row.linkLabel, row.link, href),
          }
    case 'storeDirectory':
      return title === null
        ? null
        : { type: 'storeDirectory', id, title, lede: text(row.lede), empty: text(row.empty) }
    default:
      return null
  }
}

/** The stored `layout` → the sections to draw, in order. */
export function projectBlocks(layout: unknown, href: SurfaceHref): readonly ShopBlockVM[] {
  return rowsOf(layout).flatMap((row, index) => {
    const id = text(row.id) ?? `block-${index}`
    const block = blockOf(row, id, href)
    return block === null ? [] : [block]
  })
}
