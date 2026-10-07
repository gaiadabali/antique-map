/**
 * The chat panel's own copy of the stream contract (AI.md §2.2, `docs/reports/workers/8.1.md`
 * "The route contract"). Deliberately not imported from `server/chat/types`: that module is
 * `server-only` and must never reach the browser bundle. Keep this in lockstep with the server's
 * `ChatEvent` by hand — a drift here fails the panel's tests, not the route's.
 */

export type SiteKey = 'gallery' | 'shop'
export type SiteLocale = 'en' | 'id'

export type ChatCard = {
  readonly kind: 'work' | 'product' | 'store'
  readonly id: string
  readonly title: string
  readonly url: string
  readonly image: string | null
  readonly statusLabel?: string
  readonly priceLabel?: string
}

export type HandoffChannel = 'whatsapp' | 'email'

export const LEAD_KINDS = ['ask', 'sell', 'partnership', 'contact', 'chat'] as const
export type LeadKind = (typeof LEAD_KINDS)[number]

export type TurnOutcome = 'answered' | 'handoff' | 'refused' | 'blocked'

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

/** One event of `POST /api/x/chat/message`'s `text/event-stream`. */
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
      readonly consentToken: string
    }
  | { readonly type: 'done'; readonly outcome: TurnOutcome }
  | { readonly type: 'error'; readonly code: ChatErrorCode; readonly message: string }

/** `POST /api/x/chat/session`'s success shapes. */
export type StartSessionResult =
  | { readonly ok: true; readonly resumed: false; readonly limits: ChatLimits }
  | { readonly ok: true; readonly resumed: true }
  | { readonly ok: false; readonly code: ChatErrorCode; readonly message: string }

export type ChatLimits = {
  readonly maxMessageChars: number
  readonly messagesPerSession: number
}

export type ConsentPayload = {
  readonly consentToken: string
  readonly name: string
  readonly whatsapp: string | null
  readonly email: string | null
  readonly preferredChannel: HandoffChannel
  readonly message: string
  readonly idempotencyKey: string
}

export type ConsentResult =
  | { readonly ok: true; readonly reference: string }
  | { readonly ok: false; readonly code: string; readonly message: string }
