/**
 * @contract C2 — fixtures `want-list` (by email, received, sent back, rate-limited, for an account, pending, active, confirmed, stopped, gone, expired) · owner: ARC
 *
 * One page for every alert link (D39): a guest saving "maps of Pulau Contoh under US$2,000" with
 * an email to confirm, and that post received — the same answer for any address; a signed-in
 * gallery buyer saving an item alert to the account, no email asked; then the page as an email's
 * link opens it — a list to confirm by its button (never by the link itself), one on, one gone.
 * Everything resolves at request time, so all of it works without JavaScript.
 */
import type { WantListFormVM, WantListPageVM, WantListVM } from '../surfaces/want-list'
import { entry, hidden, tick } from './_forms'
import { money, seo } from './_shared'

const page = { ...seo('Alerts', '/alerts'), noindex: true }
/** The listing watched: maps of Pulau Contoh up to USD 2,000.00, its budget in minor units. */
const WATCH = '/antique-maps/contoh?price=0-200000'
const ACTION = '/api/x/commerce/want-lists'
const frequency = entry('frequency', 'radio', {
  options: { values: ['instant', 'daily'], names: 'message' },
  value: 'instant',
})

const byEmail: WantListFormVM = {
  label: 'Maps of Pulau Contoh',
  budget: money(200000, 'USD'),
  holder: 'email',
  form: {
    fields: [
      hidden('subject.kind', 'listing'),
      hidden('subject.path', WATCH),
      entry('contact.email', 'email', { autocomplete: 'email', inputMode: 'email' }),
      hidden('contact.locale', 'en'),
      frequency,
      tick('consent.alerts', 'consent', true),
      tick('consent.marketingEmail', 'consent'),
      hidden('returnTo', `/alerts?watch=${encodeURIComponent(WATCH)}`),
    ],
    action: ACTION,
  },
}

export const wantListSubscribe: WantListPageVM = {
  surface: 'wantList',
  title: 'Email me new maps of Pulau Contoh',
  subscribe: byEmail,
  opened: null,
  result: null,
  note: { code: 'wantListByEmail' },
  seo: page,
}

/** Sent without JavaScript: the same answer whatever the address already watches. */
export const wantListReceived: WantListPageVM = {
  ...wantListSubscribe,
  result: { kind: 'received', reply: { code: 'wantListConfirmSent' } },
}

/** A signed-in gallery buyer, from a sold item's alert: saved to the account, no email asked. */
export const wantListForAccount: WantListPageVM = {
  ...wantListSubscribe,
  title: 'Tell me when another example arrives',
  subscribe: {
    label: 'Another example of the Isle of Contoh',
    budget: null,
    holder: 'account',
    form: {
      fields: [
        hidden('subject.kind', 'like'),
        hidden('subject.productId', '1001'),
        frequency,
        tick('consent.alerts', 'consent', true),
        hidden('returnTo', '/alerts?like=1001'),
      ],
      action: ACTION,
    },
  },
}

const list: WantListVM = {
  id: 'wl-9',
  label: 'Maps of Pulau Contoh',
  href: WATCH,
  budget: money(200000, 'USD'),
  frequency: 'instant',
  status: 'pending',
  lastNotifiedAt: null,
  confirm: { access: { kind: 'access-cookie' } },
  stop: { access: { kind: 'access-cookie' } },
}

/** Opened from the confirmation email: the list starts by its button, never by the link. */
export const wantListPending: WantListPageVM = {
  ...wantListSubscribe,
  title: 'Your alert',
  subscribe: null,
  opened: { kind: 'list', list },
}

/** Opened from an alert: on, with its stop button. */
export const wantListActive: WantListPageVM = {
  ...wantListPending,
  opened: {
    kind: 'list',
    list: { ...list, status: 'active', lastNotifiedAt: '2026-10-02T08:00:00+08:00', confirm: null },
  },
}

/** A link to a list never confirmed in time, or stopped: nothing to show but how to start again. */
export const wantListGone: WantListPageVM = { ...wantListPending, opened: { kind: 'gone' } }

/** Sent back without JavaScript: the address malformed, every entry kept. */
export const wantListInvalid: WantListPageVM = {
  ...wantListSubscribe,
  result: {
    kind: 'invalid',
    fields: [{ path: 'contact.email', reason: 'format' }],
    values: { 'contact.email': 'anna@example' },
  },
}

export const wantListRateLimited: WantListPageVM = {
  ...wantListSubscribe,
  result: { kind: 'rateLimited', retryAfterSeconds: 300 },
}

/** Its button pressed: the list is on. */
export const wantListConfirmed: WantListPageVM = {
  ...wantListActive,
  result: { kind: 'received', reply: { code: 'wantListConfirmed' } },
}

/** Stopped: erased, so the link that opened the page names nothing now. */
export const wantListStopped: WantListPageVM = {
  ...wantListGone,
  result: { kind: 'received', reply: { code: 'wantListStopped' } },
}

/** Confirming a list that lapsed meanwhile: refused, and said so. */
export const wantListLinkExpired: WantListPageVM = {
  ...wantListGone,
  result: { kind: 'refused', code: 'not-found', message: { code: 'wantListLinkExpired' } },
}
