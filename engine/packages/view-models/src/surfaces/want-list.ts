/**
 * @contract C2 — view models: want lists · owner: ARC · consumers: WEB, UXG, UXE
 *
 * A saved search or an item alert (C6 `wantList.*`). Every alert link — a listing's, an item's,
 * a bag line's, a checkout's conflict — leads to one page (C10 `wantList`, module
 * `retention.emailWantList`, D39), which saves the subject its URL names: to a signed-in buyer's
 * account where `retention.wantList` is on, else for an email address to confirm. An address's
 * emails land there too (C13 `WANT_LIST_ACCESS`), to confirm its list or stop it. A visitor
 * without JavaScript can do all of it, so nothing here streams: the form, the list a link opened
 * and a post's result are resolved at request time (`../loaders`). The account lists its own in
 * its `wantLists` section (`./account`).
 */
import type {
  WantListAccess,
  WantListConfirmRequest,
  WantListFrequency,
  WantListStatus,
} from '@engine/domain/api'

import type { IsoDateTime, MessageVM, Money, SeoVM } from '../common'
import type { FormPostVM, FormResultVM } from './form-fields'

/** A list as its holder sees it: in the account's section, or on the page its email opened. */
export type WantListVM = {
  id: string
  /** "Maps of Bali" — the subject in words; the app adds the budget, formatted from `budget`. */
  label: string
  /** The listing it watches, or the item another example of which it waits for. */
  href: string
  /** In the market currency it was saved in. */
  budget: Money | null
  frequency: WantListFrequency
  status: WantListStatus
  lastNotifiedAt: IsoDateTime | null
  /** "Confirm this alert" — an address's pending list only: posts C6 `wantList.confirm`. */
  confirm: WantListConfirmRequest | null
  /**
   * "Stop this alert": posts C6 `wantList.unsubscribe`, by the account or the page's cookie —
   * never by the token, which stays in its cookie (C13 `WANT_LIST_ACCESS`) and so never enters
   * the page's HTML (`commerce-check.ts`).
   */
  stop: { access: Exclude<WantListAccess, { kind: 'token' }> }
}

/**
 * The form that saves what the page's URL names (C6 `wantList.subscribe`): the subject as hidden
 * fields, the frequency, the consent — and, for an address, the email. `holder` says where the
 * alerts will live, so the page can say it before the visitor sends.
 */
export type WantListFormVM = {
  /** The subject in words, the budget apart, as `WantListVM` has them. */
  label: string
  budget: Money | null
  holder: 'account' | 'email'
  form: FormPostVM
}

export type WantListPageVM = {
  surface: 'wantList'
  title: string
  /**
   * Saving what the URL names (`?watch=` a listing's canonical path, `?like=` an item); `null` when
   * it names nothing, or nothing that can be watched. A `watch` that is not its listing's canonical
   * path (C10 `href()` of what it parses to) is answered `redirectTo` the canonical want-list URL,
   * so one listing has one want-list page.
   */
  subscribe: WantListFormVM | null
  /**
   * The list the email link that opened this page names; `gone` when it names none any more
   * (never confirmed in time, or stopped); `null` without the cookie.
   */
  opened: { kind: 'list'; list: WantListVM } | { kind: 'gone' } | null
  /** The last post from this page (C13 `FORM_RESULT`): received, confirmed, stopped, or sent back. */
  result: FormResultVM | null
  /** Where alerts live, said plainly: "By email — each alert has a link to stop it". */
  note: MessageVM
  seo: SeoVM
}
