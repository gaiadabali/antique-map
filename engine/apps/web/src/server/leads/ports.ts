/**
 * The lead service's seams: Turnstile, the per-address limit, the database and the owner's email
 * are each behind one, so the whole service runs in tests against doubles. The real ones are
 * `./deps` (built on the first request, never at import or at build).
 */
import type { LeadInput, LeadKind, LeadSite } from './input'

/** What `store.create` writes: the validated input and the consent time the server stamped. */
export type NewLeadRecord = LeadInput & { readonly consentAt: string }

/** What the owner's "new lead" email may know: which lead, of what kind, on which site. */
export type NewLeadNotice = {
  readonly id: number | string
  readonly kind: LeadKind
  readonly site: LeadSite
}

export interface LeadDeps {
  now(): Date
  /** Cloudflare Turnstile's `siteverify`; `false` for any failure, and while it is not configured. */
  verifyTurnstile(token: string, remoteIp: string | null): Promise<boolean>
  /** One post for this address; `false` once it has used its allowance for the window. */
  allow(ipKey: string): boolean
  store: { create(lead: NewLeadRecord): Promise<{ id: number | string }> }
  /** Tells the owner; may throw — `createLead` logs it and keeps the lead. */
  notify(notice: NewLeadNotice): Promise<void>
  /** Warnings only: never a contact detail or a message. */
  log(message: string): void
}
