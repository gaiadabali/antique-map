/**
 * @contract C2 — view models: the Partnership page · owner: ARC · consumers: WEB, UXE, DOM
 *
 * The one programme for every business buyer (D31, D36; module `accounts.retailers`): shops,
 * hotels, villas, cafés and companies all apply as partners, and the shop has no other trade
 * path. It is reached from a highlight in the home hero and a **Partnership** header item. It
 * says what a partner gets, as published content and never a trade price, and its last
 * section holds the application and partner sign-in, inline or as a dialog. Staff approve an
 * application, approval emails a set-password link (C13 `PASSWORD_LINK`), and the partner
 * signs in; a partner who is not approved cannot (D34).
 *
 * It works without JavaScript. The application and sign-in are cached (`visitor`) and are the
 * fallback `access` streams into. `access` holds only what this visitor has: a post's result
 * (C13 `FORM_RESULT`), an application's standing (the session, or C13 `APPLICATION_ACCESS`),
 * or a signed-in partner. There is never a token in the page's URL, and no term before sign-in.
 */
import type { BlockVM } from '../blocks'
import type { LinkVM, MessageVM, SeoVM, Streamed } from '../common'
import type { SignInErrorVM, SignInFormVM } from './account-entry'
import type { PendingRetailerVM } from './account-retailer'
import type { FormPostVM, FormResultVM } from './form-fields'

/** What a partner gets, for one kind of business ("For hotels and villas"). */
export type PartnershipBenefitVM = {
  title: string
  body: readonly BlockVM[]
  /**
   * "Pricing · Trade tiers, visible once you sign in": published content an editor writes.
   * It is never read from `commerce.trade`; a tier, a discount or a minimum appears only in an
   * approved partner's own area.
   */
  terms: readonly { label: string; value: string }[]
}

/**
 * The application, the same for every kind of business (D36): C6 `RetailerApplyRequest`'s
 * fields in their fieldsets (`business`, `contact`, `consent`) — each marketing ask a separate
 * box, unticked — plus the hidden `returnTo` and `contact.locale`; it posts `retailer.apply`.
 */
export type PartnershipApplyVM = FormPostVM & {
  /** "Most applications are answered within two working days". */
  reply: MessageVM | null
}

type Applied = Extract<PendingRetailerVM, { status: 'applied' }>
type Declined = Extract<PendingRetailerVM, { status: 'declined' }>

/** What this visitor has, streamed over the cached forms; `null` for none. */
export type PartnershipAccessVM =
  /** Sent: one answer whoever applied — a new business, one waiting, a partner. */
  | { kind: 'received'; reply: MessageVM | null }
  /** Sent back: every failing field at once and every entry kept, or the rate limit. */
  | { kind: 'applyFailed'; result: Exclude<FormResultVM, { kind: 'received' }> }
  /** Sign-in came back, its email kept. */
  | { kind: 'signInFailed'; email: string | null; error: SignInErrorVM }
  /** Waiting on staff: shown in place of the application. */
  | { kind: 'applied'; standing: Applied }
  /** Declined: said plainly, beside the application to apply again. */
  | { kind: 'declined'; standing: Declined }
  /** A signed-in partner: the way to its area, in place of the forms. */
  | { kind: 'retailer'; firstName: string | null; area: LinkVM }

export type PartnershipVM = {
  surface: 'partnership'
  title: string
  intro: readonly BlockVM[]
  /** "100+ shops supplied" · "Printed in our own workshop": the programme's proof, as content. */
  highlights: readonly string[]
  benefits: readonly PartnershipBenefitVM[]
  /**
   * The forms as anyone meets them, cached so they show without JavaScript; sign-in is the
   * account's own (`auth.signIn`).
   */
  visitor: { apply: PartnershipApplyVM; signIn: SignInFormVM }
  /** This visitor's, at request time, inside the page's `<Suspense>`. */
  access: Streamed<PartnershipAccessVM | null>
  /** "Prefer to talk first?" */
  whatsapp: { href: string; display: string } | null
  seo: SeoVM
}
