/**
 * @contract C4 — content blocks · owner: ARC · consumers: SCH (Payload definitions), UXG, UXE (renderers)
 *
 * The frozen list (DESIGN-SYSTEM.md §5): fifteen named blocks, and long-form fields are runs
 * of them — a work's description, a maker's bio, a story's body, a page's body — never an
 * open rich-text field. These are the resolved shapes a renderer receives: relationships
 * populated, images flattened (C9), rich text as a small tree rather than raw Lexical JSON.
 * SCH writes one Payload block per member; each app writes one renderer per member, typed
 * `BlockRenderers<…>`, so a new block without a renderer in both apps fails to compile.
 */
import type { ListingQuery } from '@engine/config/routes'

import type { CardVM } from './cards'
import type { DatePrecision, Id, ImageVM, LinkVM, Streamed } from './common'

// ── Rich text (the `prose` block, callouts, FAQ answers) ───────────────────────────────

export type TextMark = 'bold' | 'italic' | 'smallCaps' | 'superscript' | 'subscript'

/** What an inline link points at, so the app can style a maker link unlike a web link. */
export type LinkTarget = 'item' | 'maker' | 'place' | 'source' | 'story' | 'page' | 'external'

/** A citation of a bibliography entry (`sources`), e.g. Tooley 1268. */
export type CitationVM = { shortCite: string; ref: string | null; href: string | null }

export type InlineNode =
  | {
      type: 'text'
      text: string
      marks: readonly TextMark[]
      /** A quotation in another language (a Latin title, a Dutch caption). */
      lang: string | null
    }
  | { type: 'link'; href: string; target: LinkTarget; children: readonly InlineNode[] }
  /**
   * A note mark: a sidenote on wide screens, a footnote on phones. `number` is its order
   * in the field; `body` is the note; `citation` names the source it cites, if any.
   */
  | {
      type: 'note'
      id: string
      number: number
      body: readonly InlineNode[]
      citation: CitationVM | null
    }
  | { type: 'lineBreak' }

export type RichTextNode =
  | { type: 'paragraph'; children: readonly InlineNode[] }
  /** `id` is the anchor for a table of contents. */
  | { type: 'heading'; level: 2 | 3 | 4; id: string; children: readonly InlineNode[] }
  | { type: 'list'; ordered: boolean; items: readonly (readonly RichTextNode[])[] }
  | { type: 'quote'; children: readonly InlineNode[] }

// ── The fifteen blocks ─────────────────────────────────────────────────────────────────

type Block<Type extends string, Props> = { type: Type; id: Id } & Props

export type ProseBlock = Block<'prose', { content: readonly RichTextNode[] }>

export type FigureBlock = Block<
  'figure',
  {
    image: ImageVM
    caption: string | null
    credit: string | null
    width: 'measure' | 'wide' | 'full'
  }
>

/**
 * A region of a work ("see the cartouche"): the crop is rendered as an image, and opens the
 * viewer at that region. `region` is in the full image's pixels (IIIF `x,y,w,h`).
 */
export type ZoomFigureBlock = Block<
  'zoomFigure',
  {
    image: ImageVM
    caption: string | null
    region: { x: number; y: number; w: number; h: number }
    work: { title: string; href: string; manifest: string | null }
  }
>

/** Two states of one plate, then and now: side by side, or on a slider (with a keyboard alternative). */
export type CompareBlock = Block<
  'compare',
  {
    mode: 'sideBySide' | 'slider'
    before: { image: ImageVM; label: string }
    after: { image: ImageVM; label: string }
    caption: string | null
  }
>

/**
 * An image with hotspots linking to products (a room, a flat-lay). Hotspots are content; the
 * products' prices and availability stream, in hotspot order.
 */
export type ShoppableImageBlock = Block<
  'shoppableImage',
  {
    image: ImageVM
    caption: string | null
    /** Fractions of the image, 0–1. */
    hotspots: readonly { x: number; y: number; label: string; href: string }[]
    products: Streamed<readonly CardVM[]>
  }
>

export type GalleryBlock = Block<
  'gallery',
  {
    /** 2–12. */
    images: readonly { image: ImageVM; caption: string | null }[]
    layout: 'grid' | 'strip' | 'mosaic'
  }
>

export type PullQuoteBlock = Block<
  'pullQuote',
  { quote: string; attribution: string | null; citation: CitationVM | null }
>

/** Hand-picked products or a saved query; `more` opens the query as a browse page. */
export type ProductRailBlock = Block<
  'productRail',
  {
    title: string | null
    source: 'manual' | 'query'
    query: ListingQuery | null
    limit: number
    items: Streamed<readonly CardVM[]>
    more: LinkVM | null
  }
>

export type TimelineBlock = Block<
  'timeline',
  {
    entries: readonly {
      year: number
      precision: DatePrecision
      label: string
      note: string | null
    }[]
  }
>

export type CalloutBlock = Block<
  'callout',
  { tone: 'info' | 'caution'; title: string | null; body: readonly RichTextNode[] }
>

/** Rendered as accessible disclosures and emitted as `FAQPage` JSON-LD. */
export type FaqBlock = Block<
  'faq',
  { items: readonly { question: string; answer: readonly RichTextNode[] }[] }
>

export type CtaBlock = Block<'cta', { label: string; href: string; style: 'primary' | 'quiet' }>

export type EmbedBlock = Block<
  'embed',
  | {
      kind: 'video'
      provider: 'youtube' | 'vimeo' | 'file'
      src: string
      title: string
      poster: ImageVM | null
    }
  /** The full deep-zoom viewer of a work. */
  | { kind: 'viewer'; work: { title: string; href: string }; manifest: string }
>

/** The signup unit; `sourceKey` records where a subscriber came from. */
export type NewsletterBlock = Block<
  'newsletter',
  { sourceKey: string; title: string | null; body: string | null }
>

export type DividerBlock = Block<'divider', { title: string | null }>

/** Every block — the frozen list. Adding a member is a contract change (CONTRACTS.md). */
export type BlockVM =
  | ProseBlock
  | FigureBlock
  | ZoomFigureBlock
  | CompareBlock
  | ShoppableImageBlock
  | GalleryBlock
  | PullQuoteBlock
  | ProductRailBlock
  | TimelineBlock
  | CalloutBlock
  | FaqBlock
  | CtaBlock
  | EmbedBlock
  | NewsletterBlock
  | DividerBlock
export type BlockType = BlockVM['type']
export type BlockOf<Type extends BlockType> = Extract<BlockVM, { type: Type }>

/** The frozen list as data, for SCH's registry test (each Payload block ↔ one member). */
export const BLOCK_TYPES = [
  'prose',
  'figure',
  'zoomFigure',
  'compare',
  'shoppableImage',
  'gallery',
  'pullQuote',
  'productRail',
  'timeline',
  'callout',
  'faq',
  'cta',
  'embed',
  'newsletter',
  'divider',
] as const satisfies readonly BlockType[]

/**
 * One renderer per block — an app's map is typed with this (`R` is its node type, e.g.
 * `ReactNode`), so leaving a block out is a compile error (see `./blocks-check.ts`).
 */
export type BlockRenderers<R> = { readonly [Type in BlockType]: (block: BlockOf<Type>) => R }
