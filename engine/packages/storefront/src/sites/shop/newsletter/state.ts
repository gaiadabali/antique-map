/**
 * What the newsletter pop-up's server action answers and its island renders (TASKS.md 28.2): plain
 * data only — lexicon keys for the errors, the typed address to put back. No lexicon here, so the
 * client island imports it without the shop's copy.
 */
export type NewsletterState = {
  readonly status: 'idle' | 'error' | 'success'
  /** Field name (or `form`) → lexicon key. Empty unless `status` is `error`. */
  readonly errors: Readonly<Record<string, string>>
  readonly email: string
}

export const INITIAL_NEWSLETTER_STATE: NewsletterState = { status: 'idle', errors: {}, email: '' }

/** The consent the lead records with the time it was given (the box's words, COMPLIANCE.md §6). */
export const NEWSLETTER_CONSENT_VERSION = 'newsletter-2026-11-19'

/** Where the pop-up remembers, per browser, that this visitor has seen it. */
export const NEWSLETTER_SEEN_KEY = 'oei:newsletter-seen'

/**
 * How long after the home has loaded the pop-up opens: "upon entering the landing page" (the
 * owner's feedback of 2026-11-19), a beat after the page has drawn so it never opens on a blank one.
 */
export const NEWSLETTER_DELAY_MS = 1500

/** The words the island needs, resolved on the server. */
export type NewsletterText = {
  readonly title: string
  readonly text: string
  readonly email: string
  readonly consent: string
  readonly submit: string
  readonly sending: string
  readonly close: string
  readonly success: string
  readonly privacy: string
  /** Lexicon key → words, for the errors the server may answer with. */
  readonly errors: Readonly<Record<string, string>>
}
