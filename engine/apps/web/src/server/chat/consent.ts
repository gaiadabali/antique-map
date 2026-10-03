/**
 * The consent gate (AI.md §4). `create_lead` from the model never creates a lead: it mints a
 * single-use consent token, bound to the session, the lead kind and the items, and the server
 * emits `lead_form`. Only the visitor's click — the form posted to `/api/x/chat/consent` with
 * that token and `consent: true` — creates the lead, and the model only ever learns the
 * reference. Tokens live in this process (DEPLOYMENT.md: one process, fork mode) for 30
 * minutes; a restart costs the visitor one more click on "contact me".
 *
 * Idempotency: a submission carries a client key; a repeat with the same key and token answers
 * the first reference instead of creating a second lead.
 */
import 'server-only'

import { randomBytes } from 'node:crypto'

import { CHAT_LIMITS } from './env'
import type { LeadKind, SiteKey, SiteLocale } from './types'

export type PendingConsent = {
  readonly sessionId: string
  readonly site: SiteKey
  readonly locale: SiteLocale
  readonly kind: LeadKind
  readonly summary: string
  readonly itemIds: readonly string[]
  readonly expiresAt: number
}

type Used = { readonly reference: string; readonly key: string; readonly expiresAt: number }

export class ConsentStore {
  private readonly pending = new Map<string, PendingConsent>()
  private readonly claimed = new Map<string, PendingConsent>()
  private readonly used = new Map<string, Used>()

  constructor(private readonly now: () => number = Date.now) {}

  issue(consent: Omit<PendingConsent, 'expiresAt'>): string {
    this.sweep()
    const token = randomBytes(24).toString('base64url')
    this.pending.set(token, { ...consent, expiresAt: this.now() + CHAT_LIMITS.consentTtlMs })
    return token
  }

  /**
   * Takes the pending consent for `token` in `sessionId` out of the pending set, synchronously, so
   * two concurrent submissions cannot both create a lead; `null` when unknown, expired, already
   * claimed or another session's. `release()` puts it back if creating the lead fails.
   */
  claim(token: string, sessionId: string): PendingConsent | null {
    this.sweep()
    const consent = this.pending.get(token)
    if (consent === undefined || consent.sessionId !== sessionId) return null
    this.pending.delete(token)
    this.claimed.set(token, consent)
    return consent
  }

  release(token: string): void {
    const consent = this.claimed.get(token)
    this.claimed.delete(token)
    if (consent !== undefined) this.pending.set(token, consent)
  }

  /** The first reference a token produced, when this is a repeat of the same submission. */
  replay(token: string, idempotencyKey: string): string | null {
    const used = this.used.get(token)
    return used !== undefined && used.key === idempotencyKey ? used.reference : null
  }

  /** Marks the token spent: it can never create a second lead. */
  complete(token: string, idempotencyKey: string, reference: string): void {
    this.claimed.delete(token)
    this.used.set(token, {
      reference,
      key: idempotencyKey,
      expiresAt: this.now() + 24 * 60 * 60 * 1000,
    })
  }

  private sweep(): void {
    const now = this.now()
    for (const [token, consent] of this.pending)
      if (consent.expiresAt <= now) this.pending.delete(token)
    for (const [token, used] of this.used) if (used.expiresAt <= now) this.used.delete(token)
  }
}
