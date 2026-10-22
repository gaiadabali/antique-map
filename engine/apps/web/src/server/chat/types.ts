/**
 * The chat's shared types (AI.md §2): the stream contract the panel (TASKS.md 8.2) renders, the
 * settings a turn reads from `site-settings`, and the public shapes the tools return. Nothing in
 * here is a Payload type: the adapters map documents onto these, so a field 3.2 or 3.3 adds to a
 * collection never reaches the model by accident.
 */
import 'server-only'

import type { SiteKey, SiteLocale } from '@engine/config/sites'

export type { SiteKey, SiteLocale }

/** One event of `POST /api/x/chat/message`'s `text/event-stream` (AI.md §2.2). */
export type ChatEvent =
  | { readonly type: 'delta'; readonly text: string }
  | { readonly type: 'status'; readonly label: string }
  | ({ readonly type: 'card' } & ChatCard)
  | {
      readonly type: 'handoff'
      readonly channel: HandoffChannel
      readonly href: string
      readonly label: string
    }
  | {
      readonly type: 'lead_form'
      readonly kind: LeadKind
      readonly itemIds: readonly string[]
      readonly consentText: string
      readonly consentVersion: string
      /** Single-use, bound to this session; posted back with the form to `/api/x/chat/consent`. */
      readonly consentToken: string
    }
  | { readonly type: 'done'; readonly outcome: TurnOutcome }
  | { readonly type: 'error'; readonly code: ChatErrorCode; readonly message: string }

export type ChatCard = {
  readonly kind: 'work' | 'product' | 'store'
  readonly id: string
  readonly title: string
  readonly url: string
  readonly image: string | null
  readonly statusLabel?: string
  /** The shop only, copied from a tool result; a gallery card never carries one. */
  readonly priceLabel?: string
}

export type HandoffChannel = 'whatsapp' | 'email'

export const LEAD_KINDS = ['ask', 'sell', 'partnership', 'contact', 'chat'] as const
export type LeadKind = (typeof LEAD_KINDS)[number]

/** How a turn ended, as `done.outcome`. */
export type TurnOutcome = 'answered' | 'handoff' | 'refused' | 'blocked'

/** `chat-sessions.outcome` (CONTENT-MODEL.md §6). */
export type SessionOutcome = 'refused' | 'blocked' | 'handoff' | 'lead'

export const CHAT_ERROR_CODES = [
  'rate_limited',
  'budget_exhausted',
  'disabled',
  'unavailable',
  'too_long',
  'session_limit',
  'session_required',
  'challenge_required',
  'bad_request',
] as const
export type ChatErrorCode = (typeof CHAT_ERROR_CODES)[number]

/** The classifier's labels (AI.md §2.1 step 3). */
export const CLASSIFIER_LABELS = [
  'browse',
  'item_question',
  'price_request',
  'authenticity_valuation',
  'sell_to_us',
  'partnership',
  'order_status',
  'delivery',
  'off_topic',
  'injection_attempt',
  'abuse',
] as const
export type ClassifierLabel = (typeof CLASSIFIER_LABELS)[number]

/** One delivery band from `site-settings` (the shop). */
export type DeliveryBand = { readonly upToKm: number; readonly feeIdr: number }

/** What one turn reads from `site-settings` for its site — nothing more is selected. */
export type ChatSettings = {
  readonly contact: { readonly whatsapp: string | null; readonly email: string | null }
  readonly replyPromise: string | null
  readonly ai: {
    readonly chatEnabled: boolean
    readonly dailyBudgetUsd: number
    readonly sessionTokenCap: number
  }
  /** The shop only; `null` on the gallery. */
  readonly delivery: {
    readonly bands: readonly DeliveryBand[]
    readonly freeOverIdr: number | null
  } | null
}

export type TranscriptEntry = {
  readonly role: 'user' | 'assistant'
  readonly text: string
  readonly at: string
}

/** A `chat-sessions` record as the chat reads it. */
export type ChatSessionRecord = {
  readonly id: string
  readonly site: SiteKey
  readonly locale: SiteLocale
  readonly startedAt: string
  readonly lastMessageAt: string
  readonly transcript: readonly TranscriptEntry[]
  readonly labels: readonly string[]
  readonly usage: {
    readonly inputTokens: number
    readonly outputTokens: number
    readonly costUsd: number
  }
  readonly outcome: SessionOutcome | null
  readonly lead: string | null
}

/** Token usage of one or more model calls, as the API reports it. */
export type TokenUsage = {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}
