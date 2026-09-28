/**
 * @contract C2 — view models: the account · owner: ARC · consumers: WEB, UXG, UXE
 *
 * One surface with sections (C10 `ACCOUNT_SECTIONS`): overview · orders · wishlist ·
 * want-lists · addresses · profile · privacy — and, where their modules are on, the
 * gallery's conversations in one place (`./account-conversations`). Customers are never
 * staff (ARCHITECTURE.md §12): their session has its own cookie, and a signed-out visitor
 * meets sign-in, account creation and the claim flow for migrated accounts on this surface.
 * Private, per request and never cached; the section list shows only what the modules allow.
 */
import type { AccountSection } from '@engine/config/routes'
import type { LocaleCode } from '@engine/config/schema'

import type { CardVM } from '../cards'
import type { IsoDateTime, Money, SeoVM, Streamed } from '../common'
import type { AddressVM, ItemRefVM, MarketVM, OrderSummaryVM } from '../commerce'
import type { ConversationSectionVM } from './account-conversations'
import type { PaginationVM } from './listing'

export type * from './account-conversations'

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

export type AccountSectionVM =
  | {
      section: 'overview'
      attention: readonly AttentionVM[]
      recentOrders: readonly OrderSummaryVM[]
    }
  | { section: 'orders'; orders: readonly OrderSummaryVM[]; pagination: PaginationVM | null }
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

export type SignedOutVM = {
  kind: 'signedOut'
  /** Where sign-in returns to. */
  returnTo: AccountSection
  /** A migrated customer sets a password through a claim link (MIGRATION.md §5). */
  claim: boolean
  email: string | null
}

export type SignedInVM = {
  kind: 'signedIn'
  customer: { fullName: string; email: string }
  nav: readonly AccountNavVM[]
  view: AccountSectionVM
}

export type AccountVM = {
  surface: 'account'
  session: SignedOutVM | SignedInVM
  seo: SeoVM
}
