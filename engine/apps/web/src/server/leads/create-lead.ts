/**
 * The lead service (TASKS.md 9.1.c; AI.md §4; SECURITY.md §Forms). One entry for every public lead
 * form: Turnstile first (a failed or missing check creates nothing and costs no database call),
 * then the per-address limit, then the one validator, then the record and the owner's email.
 *
 * `createLead` never trusts the caller beyond the validated fields: the site, kind and source are
 * the calling action's constants, the consent time is the server's clock, and anything else in the
 * request is dropped by `parseLeadInput`. A failed email is logged and does not fail the lead —
 * the lead is the record the owner acts on, and it is already committed.
 */
import { parseLeadInput } from './input'
import type { LeadDeps } from './ports'

export type LeadRequest = {
  /** The form's values, unvalidated. */
  readonly input: unknown
  /** Turnstile's `cf-turnstile-response`, or `null` when the form sent none. */
  readonly turnstileToken: string | null
  /** The client address nginx appended, or `null` (a workstation). */
  readonly ip: string | null
}

export type CreateLeadResult =
  | { readonly ok: true; readonly id: number | string }
  | { readonly ok: false; readonly reason: 'challenge' | 'rate' | 'unavailable' }
  | {
      readonly ok: false
      readonly reason: 'invalid'
      /** Field name → lexicon key. */
      readonly errors: Record<string, string>
    }

const MAX_TOKEN = 2048

export async function createLead(deps: LeadDeps, request: LeadRequest): Promise<CreateLeadResult> {
  const token = request.turnstileToken
  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN) {
    return { ok: false, reason: 'challenge' }
  }
  let passed = false
  try {
    passed = await deps.verifyTurnstile(token, request.ip)
  } catch {
    passed = false
  }
  if (!passed) return { ok: false, reason: 'challenge' }

  if (!deps.allow(request.ip ?? 'unknown')) return { ok: false, reason: 'rate' }

  const parsed = parseLeadInput(request.input)
  if (!parsed.ok) return { ok: false, reason: 'invalid', errors: parsed.errors }

  let id: number | string
  try {
    // The leads collection refuses every public write by design (owner-only access); the server
    // creating one after Turnstile, the limit and validation is the only way in, so the store
    // writes with `overrideAccess: true`.
    ;({ id } = await deps.store.create({
      ...parsed.value,
      consentAt: deps.now().toISOString(),
    }))
  } catch {
    deps.log('[leads] the lead could not be stored')
    return { ok: false, reason: 'unavailable' }
  }

  try {
    await deps.notify({ id, kind: parsed.value.kind, site: parsed.value.site })
  } catch {
    deps.log(`[leads] the new-lead email for lead ${String(id)} was not sent`)
  }
  return { ok: true, id }
}
