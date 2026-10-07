/**
 * The chat's seams. Everything outside the process — the Claude API, Turnstile, the database —
 * is behind one of these, so the whole pipeline runs in tests against a scripted model, a
 * Turnstile double and an in-memory store (AI.md §6 "mocked run"). The real adapters are
 * `./adapters/*`, loaded only when a request arrives.
 */
import 'server-only'

import type Anthropic from '@anthropic-ai/sdk'

import type {
  ChatSessionRecord,
  ChatSettings,
  LeadKind,
  SessionOutcome,
  SiteKey,
  SiteLocale,
  TranscriptEntry,
} from './types'

/** One streamed answer call: the raw events, then the finished message. */
export type AnswerStream = {
  readonly events: AsyncIterable<Anthropic.MessageStreamEvent>
  finalMessage(): Promise<Anthropic.Message>
}

/**
 * The Claude API. The request types are the SDK's own, so a test double sees byte for byte what
 * would have been sent — the system prompt, the tool results, the visitor's text.
 */
export interface ChatModelClient {
  streamAnswer(params: Anthropic.MessageStreamParams, signal: AbortSignal): AnswerStream
  classify(
    params: Anthropic.MessageCreateParamsNonStreaming,
    signal: AbortSignal,
  ): Promise<Anthropic.Message>
}

export type TurnstileResult = {
  readonly success: boolean
  readonly hostname: string | null
  /** Verified with Cloudflare's published always-pass test secret: no protection, and no hostname. */
  readonly testKey?: boolean
}

/** Cloudflare Turnstile's `siteverify` (SECURITY.md §2.10). */
export interface TurnstileVerifier {
  verify(token: string, remoteIp: string | null, signal: AbortSignal): Promise<TurnstileResult>
}

/** What a projection asks of the database: one published, projected, access-checked read. */
export type CatalogueFind = {
  readonly collection: 'works' | 'products' | 'stores'
  readonly where: Readonly<Record<string, unknown>>
  readonly select: Readonly<Record<string, unknown>>
  readonly populate?: Readonly<Record<string, Readonly<Record<string, true>>>>
  readonly limit: number
  readonly locale: SiteLocale
  readonly depth: number
}

export interface CatalogueReader {
  /** Runs with `overrideAccess: false`, as an anonymous visitor would. */
  find(query: CatalogueFind): Promise<readonly unknown[]>
  /** Which of these products some active store can still sell — a yes or no, no quantities. */
  productsInStock(productIds: readonly string[]): Promise<ReadonlySet<string>>
}

export type NewSession = {
  readonly site: SiteKey
  readonly locale: SiteLocale
  readonly startedAt: string
  readonly ipHash: string
  readonly labels: readonly string[]
}

export type TurnRecord = {
  readonly entries: readonly TranscriptEntry[]
  readonly labels: readonly string[]
  readonly usage: { inputTokens: number; outputTokens: number; costUsd: number }
  /** Never downgrades a session already marked `lead`. */
  readonly outcome: SessionOutcome | null
  readonly at: string
  /** Public ids of the items tools returned this turn (the gallery's are linked to the session). */
  readonly itemIds: readonly string[]
}

export type NewLead = {
  readonly site: SiteKey
  readonly kind: LeadKind
  readonly sessionId: string
  readonly name: string
  readonly whatsapp: string | null
  readonly email: string | null
  readonly preferredChannel: 'whatsapp' | 'email'
  readonly message: string
  readonly locale: SiteLocale
  readonly consentVersion: string
  readonly consentAt: string
  /** The gallery's `works` ids (internal) the lead is about. */
  readonly workIds: readonly string[]
}

export interface ChatStore {
  /** `site-settings` for one site, selected field by field; `null` when unreadable. */
  settings(site: SiteKey, locale: SiteLocale): Promise<ChatSettings | null>
  createSession(session: NewSession): Promise<ChatSessionRecord>
  getSession(id: string): Promise<ChatSessionRecord | null>
  /** Appends one turn: transcript rows, labels, usage added to the totals, `lastMessageAt`. */
  recordTurn(id: string, turn: TurnRecord): Promise<void>
  addLabels(id: string, labels: readonly string[]): Promise<void>
  deleteSession(id: string): Promise<void>
  /** Creates the lead, or appends to an open one within 24 hours (AI.md §4); its reference. */
  createLead(lead: NewLead): Promise<{ readonly reference: string; readonly id: string }>
  linkLead(sessionId: string, leadId: string): Promise<void>
  /** USD the site's chat has spent since `since` (the WIB day's start). */
  spentSince(site: SiteKey, since: Date): Promise<number>
  /** The internal `works` id of each public id, for a lead's relation. */
  workIdsOf(publicIds: readonly string[]): Promise<readonly string[]>
}
