/**
 * The panel's state, as a pure reducer (AI.md §2.2): one entry per event the stream renders, the
 * lead form staying closed until the visitor asks for it (§4), and the retry time a 429/503's
 * `Retry-After` header carries (the stream's `error` event has no such field). Kept framework-free
 * so the behaviour is testable without a browser.
 */
import type { ChatCard, ChatErrorCode, ChatEvent, HandoffChannel, LeadKind } from './types'

export type ChatEntry =
  | { readonly kind: 'user'; readonly text: string }
  | { readonly kind: 'assistant'; readonly text: string }
  | { readonly kind: 'status'; readonly label: string }
  | { readonly kind: 'card'; readonly card: ChatCard }
  | {
      readonly kind: 'handoff'
      readonly channel: HandoffChannel
      readonly href: string
      readonly label: string
    }

export type LeadFormData = {
  readonly kind: LeadKind
  readonly itemIds: readonly string[]
  readonly consentText: string
  readonly consentVersion: string
  readonly consentToken: string
}

export type ChatState = {
  readonly entries: readonly ChatEntry[]
  readonly streaming: boolean
  readonly leadForm: LeadFormData | null
  readonly leadFormOpen: boolean
  readonly leadReference: string | null
  readonly errorCode: ChatErrorCode | null
  readonly errorMessage: string | null
  readonly retryAfterSeconds: number | null
}

export const INITIAL_CHAT_STATE: ChatState = {
  entries: [],
  streaming: false,
  leadForm: null,
  leadFormOpen: false,
  leadReference: null,
  errorCode: null,
  errorMessage: null,
  retryAfterSeconds: null,
}

export type ChatAction =
  | { readonly type: 'send'; readonly text: string }
  | { readonly type: 'event'; readonly event: ChatEvent }
  | { readonly type: 'retryAfter'; readonly seconds: number }
  | { readonly type: 'openLeadForm' }
  | { readonly type: 'closeLeadForm' }
  | { readonly type: 'leadSubmitted'; readonly reference: string }
  | { readonly type: 'networkError'; readonly message: string }

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'send':
      return {
        ...state,
        entries: [...state.entries, { kind: 'user', text: action.text }],
        streaming: true,
        errorCode: null,
        errorMessage: null,
        retryAfterSeconds: null,
      }
    case 'retryAfter':
      return { ...state, retryAfterSeconds: action.seconds }
    case 'openLeadForm':
      return state.leadForm === null ? state : { ...state, leadFormOpen: true }
    case 'closeLeadForm':
      return { ...state, leadFormOpen: false }
    case 'leadSubmitted':
      return { ...state, leadForm: null, leadFormOpen: false, leadReference: action.reference }
    case 'networkError':
      return { ...state, streaming: false, errorCode: 'unavailable', errorMessage: action.message }
    case 'event':
      return applyEvent(state, action.event)
    default:
      return state
  }
}

function applyEvent(state: ChatState, event: ChatEvent): ChatState {
  switch (event.type) {
    case 'delta': {
      const entries = [...state.entries]
      const last = entries[entries.length - 1]
      if (last !== undefined && last.kind === 'assistant') {
        entries[entries.length - 1] = { kind: 'assistant', text: last.text + event.text }
      } else {
        entries.push({ kind: 'assistant', text: event.text })
      }
      return { ...state, entries }
    }
    case 'status':
      return { ...state, entries: [...state.entries, { kind: 'status', label: event.label }] }
    case 'card':
      return {
        ...state,
        entries: [
          ...state.entries,
          {
            kind: 'card',
            card: {
              kind: event.kind,
              id: event.id,
              title: event.title,
              url: event.url,
              image: event.image,
              statusLabel: event.statusLabel,
              priceLabel: event.priceLabel,
            },
          },
        ],
      }
    case 'handoff':
      return {
        ...state,
        entries: [
          ...state.entries,
          { kind: 'handoff', channel: event.channel, href: event.href, label: event.label },
        ],
      }
    case 'lead_form':
      // Shown only once the visitor taps the prompt this entry list already carries as a handoff
      // or assistant line; the form fields themselves stay closed until `openLeadForm`.
      return {
        ...state,
        leadForm: {
          kind: event.kind,
          itemIds: event.itemIds,
          consentText: event.consentText,
          consentVersion: event.consentVersion,
          consentToken: event.consentToken,
        },
        leadFormOpen: false,
      }
    case 'done':
      return { ...state, streaming: false }
    case 'error':
      return { ...state, streaming: false, errorCode: event.code, errorMessage: event.message }
    default:
      return state
  }
}
