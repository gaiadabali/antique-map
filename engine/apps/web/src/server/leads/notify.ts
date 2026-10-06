/**
 * The owner's "new lead" email (CONTENT-OPERATIONS.md §4.1). It says only that a lead of a kind
 * arrived on a site and links to it in the admin: **no name, no message, no contact detail** ever
 * goes into the mail — it crosses the mail provider and sits in an inbox, while the lead stays in
 * the owner-only collection (COMPLIANCE.md §1; the owner opens the admin to read it).
 *
 * `notifyNewLead` is exported for the chat's hand-off to call later (5.3.c); it takes a
 * `LeadMailer`, so the Local API and the SMTP adapter stay in `./adapters`.
 */
import type { LeadKind, LeadSite } from './input'
import type { NewLeadNotice } from './ports'

export type LeadEmail = {
  readonly to: readonly string[]
  readonly subject: string
  readonly text: string
}

export interface LeadMailer {
  /** The owner's addresses for `site`: its lead-notify list, else its contact email, else none. */
  recipients(site: LeadSite): Promise<readonly string[]>
  send(email: LeadEmail): Promise<void>
  /** The admin host's origin, or `null` while `ADMIN_HOST` is unset. */
  adminOrigin: string | null
  log(message: string): void
}

const KIND_WORDS: Record<LeadKind, string> = {
  ask: 'question about an item',
  sell: 'seller',
  partnership: 'partnership',
  contact: 'contact',
  chat: 'chat hand-off',
}
const SITE_WORDS: Record<LeadSite, string> = { gallery: 'Indies Gallery', shop: 'Old East Indies' }

/** The mail for one lead. Only the notice's kind, site and id appear in it. */
export function newLeadSubjectAndText(
  notice: NewLeadNotice,
  adminOrigin: string | null,
): { subject: string; text: string } {
  const link =
    adminOrigin === null
      ? 'Open it in the admin: Leads. (ADMIN_HOST is not set, so there is no direct link.)'
      : `Open it in the admin: ${adminOrigin}/admin/collections/leads/${encodeURIComponent(String(notice.id))}`
  return {
    subject: `New ${notice.kind} lead — ${SITE_WORDS[notice.site]}`,
    text: [
      `A new ${KIND_WORDS[notice.kind]} lead arrived on ${SITE_WORDS[notice.site]}.`,
      '',
      link,
      '',
      'The message and contact details are in the admin only; they are not sent by email.',
    ].join('\n'),
  }
}

/** Emails the owner about `notice`; throws when the mail could not be sent (the caller logs it). */
export async function notifyNewLead(mailer: LeadMailer, notice: NewLeadNotice): Promise<void> {
  const to = await mailer.recipients(notice.site)
  if (to.length === 0) {
    // The marked placeholder: no address is configured, so nobody can be told yet.
    mailer.log(
      `[leads] PLACEHOLDER: no lead-notify or contact email in site-settings for ${notice.site}; lead ${String(notice.id)} is in the admin but nobody was emailed`,
    )
    return
  }
  const { subject, text } = newLeadSubjectAndText(notice, mailer.adminOrigin)
  await mailer.send({ to, subject, text })
}
