/**
 * @contract C2 — view models: the Partnership page · owner: ARC · consumers: WEB, UXE, DOM
 *
 * The retailer programme (D31, module `accounts.retailers`), reached from a highlight in the
 * home hero and a **Partnership** header item. It says what a partner gets — the programme's
 * published terms, never a trade price — and its last section opens sign-up or sign-in,
 * inline or as a dialog. Retailers are the only accounts where this page exists: an
 * application staff approve (approval emails a set-password link), then sign-in. The page may
 * also carry the brand's other trade programmes (company gifting, hotels), which lead to a
 * quote rather than an account. An applicant's standing reaches it through the session or the
 * one-hop status link in the acknowledgement (C13 auth), never a token in the page's URL.
 */
import type { BlockVM } from '../blocks'
import type { LinkVM, MessageVM, SeoVM } from '../common'
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
  /** A shop's application creates a retailer account; the others are a quote request. */
  outcome: 'account' | 'quote'
  /** Named by their C6 request paths (`business.name`, `business.npwp`, `contact.whatsapp`). */
  fields: readonly FormFieldVM[]
  /** The C13 route the path posts to. */
  action: string
}

export type PartnershipSignInVM = {
  email: string | null
  action: string
  reset: { href: string }
  /** One answer for a wrong email and a wrong password; a lockout says when to try again. */
  error: { kind: 'invalid' } | { kind: 'locked'; retryAfterMinutes: number } | null
}

/** The last section, as this visitor meets it. */
export type PartnershipAccessVM =
  /** Anyone else: the application ("What are you buying for?") and partner sign-in. */
  | {
      kind: 'visitor'
      apply: {
        paths: readonly PartnershipPathVM[]
        selected: PartnershipAudience | null
        /** "We will only write back about this application": marketing asks apart, unticked. */
        consents: readonly ('marketingEmail' | 'marketingWhatsapp')[]
        /** "Most applications are answered within two working days". */
        reply: MessageVM | null
        /** A post without JavaScript: every failing field at once, the entries kept. */
        result: Extract<FormVM['result'], { kind: 'invalid' }> | null
      }
      signIn: PartnershipSignInVM
    }
  /** This visitor's application, just sent or looked up: its standing, never a trade price. */
  | { kind: 'applicant'; standing: PendingRetailerVM }
  /** A signed-in, approved retailer: the way to their area. */
  | { kind: 'retailer'; firstName: string | null; area: LinkVM }

export type PartnershipVM = {
  surface: 'partnership'
  title: string
  intro: readonly BlockVM[]
  /** "100+ shops supplied" · "Printed in our own workshop": the programme's proof, as content. */
  highlights: readonly string[]
  programmes: readonly PartnershipProgrammeVM[]
  access: PartnershipAccessVM
  /** "Prefer to talk first?" */
  whatsapp: { href: string; display: string } | null
  seo: SeoVM
}
