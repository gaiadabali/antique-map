/**
 * @contract C2 — view models: the Partnership page · owner: ARC · consumers: WEB, UXE, DOM
 *
 * The retailer programme (D31, module `accounts.retailers`), reached from a highlight in the
 * home hero and a **Partnership** header item. It says what a partner gets — the programme's
 * published terms, never a trade price — and its last section opens sign-up or sign-in,
 * inline or as a dialog. Retailers are the only accounts where this page exists: an
 * application staff approve (approval emails a set-password link), then sign-in. The page may
 * also carry the brand's other trade programmes (company gifting, hotels), which lead to a
 * quote rather than an account. The content is cached; the last section is this visitor's
 * (`Streamed`), from the session or the status link's cookie (C13 `APPLICATION_ACCESS`) —
 * never a token in the page's URL, and no term or price before an approved retailer signs in.
 */
import type { BlockVM } from '../blocks'
import type { IsoDateTime, LinkVM, MessageVM, SeoVM, Streamed } from '../common'
import type { PendingRetailerVM } from './account-retailer'
import type { FormFieldVM, FormVM } from './form'

/** Who is applying: a shop gets a retailer account; a company or a hotel gets a quote. */
export type PartnershipAudience = 'shop' | 'company' | 'hospitality'

export type PartnershipProgrammeVM = {
  audience: PartnershipAudience
  /** "Stock our prints in your shop." */
  title: string
  body: readonly BlockVM[]
  /** "Pricing · Wholesale tiers, visible once you sign in": published terms, as content. */
  terms: readonly { label: string; value: string }[]
  cta: LinkVM
}

/** One of the application's paths: each asks only what matters for it. */
export type PartnershipPathVM = {
  audience: PartnershipAudience
  label: string
  /** A shop's application makes a retailer account (C6 `retailer.apply`); the others, a quote. */
  outcome: 'account' | 'quote'
  /**
   * Named by their C6 request paths, which differ by path (`business.npwp`,
   * `consent.marketingEmail` for a shop; `institution.organisation`,
   * `contact.consents.marketingEmail` for a quote). Each marketing ask is its own checkbox,
   * unticked: "We will only write back about this application". A hidden field carries what
   * the visitor is not asked (`contact.locale`, the page's).
   */
  fields: readonly FormFieldVM[]
  /** The C13 route the path posts to (`commerceUrl`). */
  action: string
}

/** The application — "What are you buying for?" — as it opens, or after a failed post. */
export type PartnershipApplyVM = {
  paths: readonly PartnershipPathVM[]
  selected: PartnershipAudience | null
  /** "Most applications are answered within two working days". */
  reply: MessageVM | null
  /** A post without JavaScript: every failing field at once, the entries kept. */
  result: Extract<FormVM['result'], { kind: 'invalid' }> | null
}

export type PartnershipSignInVM = {
  email: string | null
  action: string
  reset: { href: string }
  /** One answer for a wrong email and a wrong password; a lockout says when to try again. */
  error: { kind: 'invalid' } | { kind: 'locked'; retryAfterMinutes: number } | null
}

type Applied = Extract<PendingRetailerVM, { status: 'applied' }>
type Declined = Extract<PendingRetailerVM, { status: 'declined' }>

/** The last section, as this visitor meets it. */
export type PartnershipAccessVM =
  /** Anyone without an application here: the application and partner sign-in. */
  | { kind: 'visitor'; apply: PartnershipApplyVM; signIn: PartnershipSignInVM }
  /** Just applied, or back through the status link: waiting on staff. */
  | { kind: 'applicant'; standing: Applied; apply: null }
  /** Declined, or a partnership that ended: said plainly — and the way to apply again (C8). */
  | { kind: 'applicant'; standing: Declined; apply: PartnershipApplyVM }
  /** Approved, not signed in: the password from the approval email (sent again on request). */
  | {
      kind: 'approved'
      approvedAt: IsoDateTime
      next: 'set-password' | 'sign-in'
      signIn: PartnershipSignInVM
    }
  /** A signed-in, approved retailer: the way to their area. */
  | { kind: 'retailer'; firstName: string | null; area: LinkVM }

export type PartnershipVM = {
  surface: 'partnership'
  title: string
  intro: readonly BlockVM[]
  /** "100+ shops supplied" · "Printed in our own workshop": the programme's proof, as content. */
  highlights: readonly string[]
  programmes: readonly PartnershipProgrammeVM[]
  /** This visitor's, at request time, inside the page's `<Suspense>`. */
  access: Streamed<PartnershipAccessVM>
  /** "Prefer to talk first?" */
  whatsapp: { href: string; display: string } | null
  seo: SeoVM
}
