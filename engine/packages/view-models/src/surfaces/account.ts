/**
 * @contract C2 — view models: the account · owner: ARC · consumers: WEB, UXG, UXE
 *
 * One surface with sections (C10 `ACCOUNT_SECTIONS`): overview · orders · wishlist ·
 * want-lists · addresses · profile · privacy — and, where their modules are on, the
 * gallery's conversations in one place (`./account-conversations`) and a partner's terms and
 * quotes (`./account-retailer`); signed out, sign-in and the password pages
 * (`./account-entry`). Customers are never staff (ARCHITECTURE.md §12): their session has its
 * own cookie. Who may hold an account is the brand's modules (C1): buyers (`accounts.buyers`)
 * and partners by application (`accounts.retailers`); a shop with only the second offers no
 * shopper sign-up anywhere (D31), and only its approved partners sign in (D34). At launch that
 * shop is the only brand with accounts: the gallery has none (D54, v1.5), so a buyer's area is
 * built by no app yet. Private, per request, never cached.
 */
import type { AccountSection } from '@engine/config/routes'
import type { LocaleCode } from '@engine/config/schema'

import type { CardVM } from '../cards'
import type { IsoDateTime, SeoVM, Streamed } from '../common'
import type { AddressVM, ItemRefVM, MarketVM, OrderSummaryVM, ReorderIntentVM } from '../commerce'
import type { ConversationSectionVM } from './account-conversations'
import type { ResetRequestVM, SetPasswordVM, SignedOutVM } from './account-entry'
import type { ApprovedRetailerVM, RetailerSectionVM } from './account-retailer'
import type { PaginationVM } from './listing'
import type { WantListVM } from './want-list'

export type * from './account-conversations'
export type * from './account-entry'
export type * from './account-retailer'

export type AccountNavVM = {
  section: AccountSection
  href: string
  /** Open offers, active holds, upcoming viewings; `null` where a count means nothing. */
  count: number | null
  selected: boolean
}

/** Something waiting on the buyer, most urgent first: the overview's first band. */
export type AttentionVM = {
  kind: 'offerCountered' | 'holdExpiring' | 'paymentPending' | 'viewingSoon' | 'priceAnswered'
  item: ItemRefVM | null
  href: string
  until: IsoDateTime | null
}

export type ProfileVM = {
  fullName: string
  email: string
  whatsapp: string | null
  whatsappConfirmed: boolean
  locale: LocaleCode
  /** The market the buyer prefers when no ship-to cookie says otherwise. */
  market: MarketVM | null
  /**
   * What the buyer says they are, for staff's context alone — it grants nothing (v1.5). `trade`
   * is a dealer or designer buying for clients at the gallery, **never a D36 partner**: a partner
   * is an approved retailer account (`accounts.retailers`, the shop's), whose trade terms come
   * from its approval and tier (C5 `TradeTermsResolution`), never from this field.
   */
  type: 'collector' | 'institution' | 'trade' | 'retail'
  organisation: string | null
  taxId: string | null
}

/**
 * Consent per purpose, with when it was given and under which policy (COMPLIANCE.md §7).
 * `analytics` governs only the persistent first-party anonymous id that links one visitor's
 * visits: the cookieless beacon counts every visit without it, so the owner's own analytics
 * (G12) need no consent to count, and none of it is sent to a third party (ANALYTICS.md §1, v1.5).
 */
export type ConsentVM = {
  purpose: 'marketingEmail' | 'marketingWhatsapp' | 'analytics'
  granted: boolean
  at: IsoDateTime | null
  policyVersion: string | null
}

/**
 * The signed-in sections. `Reorder` is what an order row may offer, and every use says which:
 * `null` for a buyer (`BuyerSectionVM`), an approved partner's reorder (`PartnerSectionVM`).
 */
export type AccountSectionVM<Reorder extends ReorderIntentVM | null> =
  | {
      section: 'overview'
      attention: readonly AttentionVM[]
      recentOrders: readonly OrderSummaryVM<Reorder>[]
    }
  | {
      section: 'orders'
      orders: readonly OrderSummaryVM<Reorder>[]
      pagination: PaginationVM | null
    }
  /** Booking a viewing sends the wishlist ahead as the pull list. */
  | { section: 'wishlist'; items: Streamed<readonly CardVM[]>; pullList: { href: string } | null }
  /**
   * The buyer's saved searches and item alerts (`retention.wantList`, D39), each with its stop
   * button; a new one is saved from any alert link, on the want-list page (C10 `wantList`).
   */
  | { section: 'wantLists'; lists: readonly WantListVM[] }
  | { section: 'addresses'; addresses: readonly AddressVM[] }
  | { section: 'profile'; profile: ProfileVM }
  /** A copy of everything held, and erasure (UU PDP / PDPA), through `/api/x/privacy`. */
  | {
      section: 'privacy'
      consents: readonly ConsentVM[]
      export: { href: string }
      erase: { href: string }
    }
  | ConversationSectionVM
  | RetailerSectionVM

/** A buyer's sections: everything but a partner's terms and quotes, and no reorder. */
export type BuyerSectionVM = Exclude<AccountSectionVM<null>, RetailerSectionVM>
/** An approved partner's sections: its terms and quotes, and a reorder on the orders it may. */
export type PartnerSectionVM = AccountSectionVM<ReorderIntentVM | null>

type SignedIn = {
  kind: 'signedIn'
  customer: { fullName: string; email: string }
  nav: readonly AccountNavVM[]
}

/**
 * A buyer's area, or an approved partner's with its terms, quotes and reorders. A partner who
 * is not approved never signs in (D34), so there is no other area.
 */
export type SignedInVM =
  | (SignedIn & { audience: 'buyer'; view: BuyerSectionVM })
  | (SignedIn & { audience: 'retailer'; retailer: ApprovedRetailerVM; view: PartnerSectionVM })

export type AccountVM = {
  surface: 'account'
  /** Who is here — or, signed out, which page: sign-in, setting a password, asking for a link. */
  session: SignedOutVM | SetPasswordVM | ResetRequestVM | SignedInVM
  seo: SeoVM
}
