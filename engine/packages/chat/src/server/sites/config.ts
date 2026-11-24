/**
 * A site's chat, as configuration (PLAN-V2.md §3): the prompt's persona and site rules, the tool
 * definitions the model sees and the search filters they declare, and the catalogue the tools
 * read through — the site's published, projected collection. The engine asks the request's site
 * for these instead of branching on its name; the app passes one per site it serves
 * (`ChatDeps.sites`), and a host whose site has none is answered as unknown.
 *
 * What is not configuration stays in the engine, keyed by site: the hard controls of AI.md §3 —
 * the gallery's price check, the forbidden-key projection guard, the handoff guarantees — so no
 * configuration can switch one off.
 */
import 'server-only'

import type Anthropic from '@anthropic-ai/sdk'

import type { ChatCopy } from '../lexicon'
import type { CatalogueReader } from '../ports'
import type { DeliveryInfo, StoreInfo } from '../projection/stores'
import type { HandoffItem } from '../tools/handoff'
import type { ToolCall } from '../tools/validate'
import type { ChatCard, ChatEvent, ChatSettings, SiteKey, SiteLocale } from '../types'

export type SearchCall = Extract<ToolCall, { readonly name: 'search_catalogue' }>

/** What a catalogue read is given: the request's reader, locale and copy, and the turn's notes. */
export type CatalogueContext = {
  readonly reader: CatalogueReader
  readonly locale: SiteLocale
  readonly t: ChatCopy
  readonly settings: ChatSettings
  /** Records a `priceLabel` a tool returned: the shop's amount check then accepts that amount. */
  readonly notePrice: (label: string) => void
  /** Public item ids returned this turn, for the session record. */
  readonly itemIds: Set<string>
}

/** A tool's answer: the result the model reads (framed by the runner) and the server's events. */
export type CatalogueAnswer = { readonly result: unknown; readonly events: ChatEvent[] }

/** The site's catalogue as the tools read it — published-only and projected (AI.md §2.4). */
export interface SiteCatalogue {
  search(call: SearchCall, ctx: CatalogueContext): Promise<CatalogueAnswer>
  get(id: string, ctx: CatalogueContext): Promise<CatalogueAnswer>
  /** One public item as a handoff line (title, stock number or SKU, public URL), or `null`. */
  handoffItem(
    id: string,
    ctx: Pick<CatalogueContext, 'reader' | 'locale' | 't'>,
  ): Promise<HandoffItem | null>
  delivery(ctx: Pick<CatalogueContext, 'settings' | 'locale' | 't'>): DeliveryInfo
  /**
   * The sister site's card (`sister_site`): its name and absolute URL from config, or `null` when
   * none is configured. A site without it offers no `sister_site`.
   */
  sister?(ctx: Pick<CatalogueContext, 'locale' | 't'>): ChatCard | null
  /** The site's stores, when it has any (the shop); a site without them offers no `store_info`. */
  stores?(
    area: string | undefined,
    ctx: Pick<CatalogueContext, 'reader' | 'locale'>,
  ): Promise<readonly StoreInfo[]>
}

export type ChatSiteConfig = {
  readonly site: SiteKey
  /** The frozen system prompt's site-specific parts (AI.md §2.3); `./prompt` frames them. */
  readonly prompt: { readonly persona: string; readonly rules: string }
  /** The tool definitions, in order: deterministic bytes, so the prompt cache holds. */
  readonly tools: readonly Anthropic.Tool[]
  /** The keys `search_catalogue.filters` may carry, as its definition declares them. */
  readonly searchFilters: readonly string[]
  readonly catalogue: SiteCatalogue
}

/** The configurations an app serves, by site. */
export type ChatSites = Readonly<Partial<Record<SiteKey, ChatSiteConfig>>>

/** The site's configuration; a request only reaches here for a site the app serves. */
export function siteConfig(sites: ChatSites, site: SiteKey): ChatSiteConfig {
  const config = sites[site]
  if (config === undefined) throw new Error(`no chat configuration for ${site}`)
  return config
}
