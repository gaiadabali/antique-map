/**
 * @contract C2 — view models: form fields and what a post answers · owner: ARC · consumers: WEB, UXG, UXE
 *
 * The parts every form shares: the Form surface, the Partnership page, the account's password
 * pages, a partner's quote brief. A field is data the loader builds. Its `name` is its dotted
 * path in the request it posts (C6's, or an auth operation's, C13) and the key its label and
 * hint are looked up by, so no English string arrives in a field: its label at `<name>`
 * (`contact.email`), its hint — where the app gives one — at **`<name>Hint`**
 * (`contact.emailHint`), and a hint with a count at `<name>Hint.<plural form>` (v1.5, the keys
 * TASKS.md 6.3.h made). A form posts to its C13 route with JavaScript or without; without, it
 * comes back through C13's `FORM_RESULT`.
 */
import type { FieldError, ProblemCode } from '@engine/domain/api'

import type { MessageVM } from '../common'

/**
 * The fieldset a field renders in, its legend looked up by this **bare** key (`contact`,
 * `institution`, `business`, `consent`) — so a group is never named like a field (v1.5).
 */
type Grouped = { name: string; group: string | null }

/**
 * A field the visitor fills in. `autocomplete` is its HTML token wherever one exists (WCAG
 * 1.3.5: `organization`, `street-address`, `country`, `url`, `name`, `email`, `tel`, `username`,
 * `current-password`, `new-password`); `inputMode` the keyboard a phone shows (`numeric` for an
 * NPWP, `tel` for WhatsApp). A `money` field — the offer's bid, the one amount a client sends —
 * takes major units in ASCII digits, its currency the ship-to market's (`inputMode: 'decimal'`,
 * or `'numeric'` for a currency with no minor unit), decoded by C13's `FORM_DECODING`.
 */
export type EntryFieldVM = Grouped & {
  input:
    | 'text'
    | 'email'
    | 'tel'
    | 'password'
    | 'textarea'
    | 'select'
    | 'radio'
    | 'date'
    | 'money'
    | 'file'
  required: boolean
  /**
   * Required only while another field holds one of these values: an NPWP while
   * `business.country` is `ID`. The hint says so — the message `message.fieldRequiredWhen`, one
   * param `{value}`: the other field's value as the page names it, a region by
   * `Intl.DisplayNames` ("Required for Indonesia"), else that value's own label (v1.5). The
   * server enforces it and the browser never does, so a business abroad can post without
   * JavaScript.
   */
  requiredWhen: { field: string; oneOf: readonly string[] } | null
  autocomplete: string | null
  inputMode: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url' | null
  /**
   * A choice's values, which the component names, never the view model: as the message
   * `<name>.<value>` (`business.shopType.hotel`), or as a region (an ISO 3166 code) through
   * `Intl.DisplayNames`. `null`: not a choice, or one whose options are elsewhere in the view
   * model (a viewing's locations and slots).
   */
  options: { values: readonly string[]; names: 'message' | 'region' } | null
  maxLength: number | null
  /** A prefill, or `null`; the entries a failed post kept replace it. */
  value: string | null
}

/**
 * A tick box. It starts unticked, posts `value` — always `'true'` — when ticked and nothing when
 * not; the handler's decoder reads the absence as `false`.
 */
export type CheckboxFieldVM = Grouped & { input: 'checkbox'; required: boolean; value: 'true' }

/**
 * Sent and never shown, so never required or autocompleted: what the page adds to its post —
 * `returnTo` (its public path, where an HTML form post answers 303) and `contact.locale` (its
 * locale). Both come back from the client, so both are untrusted: the handler takes `returnTo`
 * only if it is one of this site's pages (C10 `parsePublicPath`), and the locale only as a
 * preference among the brand's own. The `idempotencyKey` is hidden too, but never a view model's:
 * the component mints it each time it renders the form, outside any `'use cache'` (C6).
 */
export type HiddenFieldVM = { input: 'hidden'; name: string; value: string }

export type FormFieldVM = EntryFieldVM | CheckboxFieldVM | HiddenFieldVM

/** A form to post: its fields, and the C13 route it posts to. */
export type FormPostVM = { fields: readonly FormFieldVM[]; action: string }

/**
 * What a post answers: as JSON to a script, or, sent without JavaScript, through C13's
 * `FORM_RESULT` on the page it returns to. There it is resolved, never `Streamed`: the loader
 * awaits it and the page renders it in its own body, outside any nested `<Suspense>`, because
 * the only visitor who gets one has no JavaScript to reveal a streamed part (`./loaders`).
 * `received` is the same for everyone who posts that form. A failure names every failing field
 * at once and keeps every entry.
 */
export type FormResultVM =
  | { kind: 'received'; reply: MessageVM | null }
  | { kind: 'invalid'; fields: readonly FieldError[]; values: Readonly<Record<string, string>> }
  | { kind: 'rateLimited'; retryAfterSeconds: number }
  /**
   * The operation refused it (C6's `Problem` beyond a field or a rate): the item held or sold
   * meanwhile, a slot taken, a link expired, a record not found, an offer not open here — with
   * its sentence that explains and instructs, keyed by the problem's code (DESIGN-SYSTEM.md §10).
   */
  | { kind: 'refused'; code: Exclude<ProblemCode, 'invalid' | 'rate-limited'>; message: MessageVM }
