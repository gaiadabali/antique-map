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
 * shopper sign-up anywhere (D31), and only its approved partners sign in (D34). Private, per
 * request, never cached.
 */
import type { AccountSection } from '@engine/config/routes'
import type { LocaleCode } from '@engine/config/schema'

import type { CardVM } from '../cards'
import type { IsoDateTime, Money, SeoVM, Streamed } from '../common'
import type { AddressVM, ItemRefVM, MarketVM, OrderSummaryVM, ReorderIntentVM } from '../commerce'
import type { ConversationSectionVM } from './account-conversations'
import type { ResetRequestVM, SetPasswordVM, SignedOutVM } from './account-entry'
import type { ApprovedRetailerVM, RetailerSectionVM } from './account-retailer'
import type { PaginationVM } from './listing'

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

/** A saved search or "tell me when another example arrives" (EXPERIENCE-GALLERY.md §8). */
export type WantListVM = {
  id: string
  /** "Maps of Bali" — the query in words; the app adds the budget, formatted from `budget`. */
  label: string
  /** The browse page the list watches. */
  href: string
  /** In the viewer's market currency, stored with the list. */
  budget: Money | null
  frequency: 'instant' | 'weekly' | 'fortnightly'
  lastNotifiedAt: IsoDateTime | null
  unsubscribe: { href: string }
}

export type ProfileVM = {
  fullName: string
  email: string
  whatsapp: string | null
  whatsappConfirmed: boolean
  locale: LocaleCode
  /** The market the buyer prefers when no ship-to cookie says otherwise. */
  market: MarketVM | null
  type: 'collector' | 'institution' | 'trade' | 'retail'
  organisation: string | null
  taxId: string | null
}

/** Consent per purpose, with when it was given and under which policy (COMPLIANCE.md §7). */
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
