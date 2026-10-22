/**
 * The output checks (AI.md §3.3), run on each sentence before it is streamed and on the whole
 * message before it is stored. Model text is released sentence by sentence; a sentence is checked
 * together with the one before it, so an amount split across a boundary is still caught.
 *
 * - **Markup** — raw HTML tags, Markdown images and headings are stripped: the panel renders
 *   paragraphs, lists, bold and links only.
 * - **Links** — only the site's own origins, `https://wa.me/` and `mailto:` survive; any other
 *   link is removed (a Markdown link keeps its words, a bare URL goes).
 * - **Gallery price** — any currency sign, code or word, or a number tied to a money word,
 *   blocks the sentence and ends the turn.
 * - **Shop amount** — every rupiah amount must be a `priceLabel` a tool returned this session or
 *   a `site-settings` amount; another currency, or any other amount, blocks. An allowed amount is
 *   rewritten in the labels' own format ("IDR 350,000" → "Rp 350.000").
 * - **Leak canary** — the system prompt's canary, a tool's name or an internal field name blocks
 *   the message.
 */
import 'server-only'

import { TOOL_NAMES } from '../tools/schemas'
import type { SiteKey } from '../types'
import { amountsIn, canonicalAmounts, mentionsForeignCurrency, mentionsMoney } from './money'

export type BlockRule = 'gallery_price' | 'shop_amount' | 'leak'

export type CheckContext = {
  readonly site: SiteKey
  /** The site's canonical origin(s), e.g. `https://antiquemapsindonesia.com`. */
  readonly origins: readonly string[]
  /** Whole-rupiah amounts the shop may state. */
  readonly amounts: ReadonlySet<number>
  readonly canary: string
  /** The shop's label format for an allowed amount (`formatMoney`); absent, amounts stay as written. */
  readonly formatRupiah?: (rupiah: number) => string
}

const INTERNAL_NAMES = [
  'askingPrice',
  'aiDraft',
  'overrideAccess',
  '_status',
  'catalogue_data',
  'stock-levels',
  'stockLevels',
  'chat-sessions',
  'sessionTokenCap',
  'dailyBudgetUsd',
  'chatEnabled',
  'site-settings',
]

const HTML_TAG = /<\/?[a-z!][^<>]*>/gi
const MD_IMAGE = /!\[[^\]]*\]\([^)]*\)/g
const MD_HEADING = /^#{1,6}\s+/gm
const MD_LINK = /\[([^\]]{0,200})\]\(\s*((?:[^()\s]|\([^()\s]*\))+)(?:\s+"[^"]*")?\s*\)/g
const BARE_URL = /(?<![("[\w])(?:https?:\/\/|www\.)[^\s<>()]+|(?<![("[\w])mailto:[^\s<>()]+/gi

export function isAllowedLink(url: string, origins: readonly string[]): boolean {
  if (url.startsWith('mailto:')) return /^mailto:[^\s@]+@[^\s@]+\.[a-z]{2,}(?:\?\S*)?$/i.test(url)
  if (url.startsWith('https://wa.me/')) return true
  return origins.some((origin) => url === origin || url.startsWith(`${origin}/`))
}

/** Markup stripped and disallowed links removed. */
export function sanitise(text: string, origins: readonly string[]): string {
  return text
    .replace(MD_IMAGE, '')
    .replace(HTML_TAG, '')
    .replace(MD_HEADING, '')
    .replace(MD_LINK, (whole, words: string, url: string) =>
      isAllowedLink(url, origins) ? whole : words,
    )
    .replace(BARE_URL, (url) => (isAllowedLink(url.replace(/[.,;:!?]+$/, ''), origins) ? url : ''))
}

export function leaks(text: string, canary: string): boolean {
  const lower = text.toLowerCase()
  if (canary !== '' && text.includes(canary)) return true
  if (TOOL_NAMES.some((name) => lower.includes(name))) return true
  return INTERNAL_NAMES.some((name) => lower.includes(name.toLowerCase()))
}

/** The rule `sentence` breaks (judged with the sentence before it), or `null`. */
export function breaks(sentence: string, previous: string, ctx: CheckContext): BlockRule | null {
  const joined = `${previous} ${sentence}`
  if (leaks(joined, ctx.canary)) return 'leak'
  if (ctx.site === 'gallery') {
    return mentionsMoney(sentence) || (mentionsMoney(joined) && !mentionsMoney(previous))
      ? 'gallery_price'
      : null
  }
  if (mentionsForeignCurrency(sentence)) return 'shop_amount'
  const amounts = amountsIn(sentence)
  return amounts.every((amount) => amount !== null && ctx.amounts.has(amount))
    ? null
    : 'shop_amount'
}

/** A sentence boundary: end punctuation then whitespace before more text, or a line break. */
const BOUNDARY = /[.!?…]["'”’)\]]*\s+(?=\S)|\n+/g

export type FilterStep = { readonly released: string; readonly blocked: BlockRule | null }

/** Streams model text through the checks, one sentence at a time. */
export class OutputFilter {
  private buffer = ''
  private previous = ''
  private releasedText = ''
  private blockedBy: BlockRule | null = null

  constructor(private readonly ctx: CheckContext) {}

  get blocked(): BlockRule | null {
    return this.blockedBy
  }

  /** Everything released so far, as the visitor saw it. */
  get released(): string {
    return this.releasedText
  }

  push(delta: string): FilterStep {
    if (this.blockedBy) return { released: '', blocked: this.blockedBy }
    this.buffer += delta
    let out = ''
    let cut = 0
    for (const match of this.buffer.matchAll(BOUNDARY)) {
      const end = (match.index ?? 0) + match[0].length
      out += this.check(this.buffer.slice(cut, end))
      cut = end
      if (this.blockedBy) break
    }
    this.buffer = this.blockedBy ? '' : this.buffer.slice(cut)
    return { released: out, blocked: this.blockedBy }
  }

  /** The tail at the end of a model call. */
  flush(): FilterStep {
    if (this.blockedBy || this.buffer === '') return { released: '', blocked: this.blockedBy }
    const out = this.check(this.buffer)
    this.buffer = ''
    return { released: out, blocked: this.blockedBy }
  }

  private check(sentence: string): string {
    const clean = sanitise(sentence, this.ctx.origins)
    const rule = breaks(clean, this.previous, this.ctx)
    if (rule) {
      this.blockedBy = rule
      return ''
    }
    const shown =
      this.ctx.site === 'shop' && this.ctx.formatRupiah
        ? canonicalAmounts(clean, this.ctx.amounts, this.ctx.formatRupiah)
        : clean
    this.previous = shown
    this.releasedText += shown
    return shown
  }
}

/** The whole-message check before the transcript stores it. */
export function checkWholeMessage(text: string, ctx: CheckContext): BlockRule | null {
  if (leaks(text, ctx.canary)) return 'leak'
  if (ctx.site === 'gallery') return mentionsMoney(text) ? 'gallery_price' : null
  return breaks(text, '', ctx)
}
