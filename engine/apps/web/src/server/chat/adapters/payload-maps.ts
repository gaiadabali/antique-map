/**
 * Payload documents onto the chat's own shapes: `site-settings` (only the fields a turn needs,
 * selected by `settingsSelect()`) and `chat-sessions`. Pure, so tests run them without Payload.
 */
import 'server-only'

import type {
  ChatSessionRecord,
  ChatSettings,
  DeliveryBand,
  SessionOutcome,
  SiteKey,
  TranscriptEntry,
} from '../types'

const OUTCOMES: readonly SessionOutcome[] = ['refused', 'blocked', 'handoff', 'lead']

type Obj = Record<string, unknown>
const obj = (value: unknown): Obj =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Obj) : {}
const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null
const number = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

/** The global's fields a turn reads, for one site. */
export function settingsSelect(site: SiteKey): Record<string, unknown> {
  return {
    [site]: {
      contact: { whatsapp: true, email: true },
      replyPromise: true,
      ai: { chatEnabled: true, dailyBudgetUsd: true, sessionTokenCap: true },
      ...(site === 'shop' ? { delivery: { bands: true, freeOverIdr: true } } : {}),
    },
  }
}

export function mapSettings(site: SiteKey, doc: unknown): ChatSettings {
  const group = obj(obj(doc)[site])
  const contact = obj(group.contact)
  const ai = obj(group.ai)
  const delivery = obj(group.delivery)
  const bands: DeliveryBand[] = (Array.isArray(delivery.bands) ? delivery.bands : []).flatMap(
    (row) => {
      const upToKm = number(obj(row).upToKm, NaN)
      const feeIdr = number(obj(row).feeIdr, NaN)
      return Number.isFinite(upToKm) && Number.isSafeInteger(feeIdr) ? [{ upToKm, feeIdr }] : []
    },
  )
  return {
    contact: { whatsapp: text(contact.whatsapp), email: text(contact.email) },
    replyPromise: text(group.replyPromise),
    ai: {
      // Off unless the owner switched it on: the kill switch fails closed.
      chatEnabled: ai.chatEnabled === true,
      dailyBudgetUsd: number(ai.dailyBudgetUsd, 5),
      sessionTokenCap: number(ai.sessionTokenCap, 150_000),
    },
    delivery:
      site === 'shop'
        ? {
            bands,
            freeOverIdr:
              typeof delivery.freeOverIdr === 'number' ? Math.trunc(delivery.freeOverIdr) : null,
          }
        : null,
  }
}

function entries(value: unknown): TranscriptEntry[] {
  return (Array.isArray(value) ? value : []).flatMap((row) => {
    const { role, text: body, at } = obj(row)
    if ((role !== 'user' && role !== 'assistant') || typeof body !== 'string') return []
    return [{ role, text: body, at: typeof at === 'string' ? at : '' }]
  })
}

export function mapSession(doc: unknown): ChatSessionRecord | null {
  const d = obj(doc)
  const id = d.id
  if (
    (typeof id !== 'number' && typeof id !== 'string') ||
    (d.site !== 'gallery' && d.site !== 'shop')
  ) {
    return null
  }
  const usage = obj(d.usage)
  const lead = typeof d.lead === 'object' && d.lead !== null ? obj(d.lead).id : d.lead
  return {
    id: String(id),
    site: d.site,
    locale: d.locale === 'id' ? 'id' : 'en',
    startedAt: text(d.startedAt) ?? '',
    lastMessageAt: text(d.lastMessageAt) ?? '',
    transcript: entries(d.transcript),
    labels: (Array.isArray(d.labels) ? d.labels : []).filter(
      (l): l is string => typeof l === 'string',
    ),
    usage: {
      inputTokens: number(usage.inputTokens, 0),
      outputTokens: number(usage.outputTokens, 0),
      costUsd: number(usage.costUsd, 0),
    },
    outcome: OUTCOMES.includes(d.outcome as SessionOutcome) ? (d.outcome as SessionOutcome) : null,
    lead: typeof lead === 'number' || typeof lead === 'string' ? `L-${lead}` : null,
  }
}
