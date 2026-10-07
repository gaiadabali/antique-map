/**
 * The gallery's banned commerce vocabulary (TASKS.md 5.5.b; EXPERIENCE-GALLERY.md §12
 * "Deliberately absent"): the words and hrefs a visitor must never see anywhere on the gallery — no
 * cart, no checkout, no sign-in, no price, no "offer". Both languages: EN and ID.
 *
 * A term carries the reason it is banned, so a failure message explains itself. Matching is
 * case-insensitive over a page's VISIBLE TEXT and the attribute values the ticket names
 * (see `ATTRIBUTES`) — never over CSS class names or script bundles. `BANNED_HREFS` matches
 * link targets instead: a path that points at the shop's bag, checkout, account or admin.
 *
 * The one allowance is the gallery's price wording — `ALLOWED_PRICE_PHRASES`, removed from a page's
 * text before `price` / `harga` are tested, so the phrase "Price on request" (EN) and its Indonesian
 * value never fail the scan while any other use of the word still does.
 */

import galleryEn from '../../../../engine/apps/web/src/sites/gallery/lexicon/en.json' with { type: 'json' }
import galleryId from '../../../../engine/apps/web/src/sites/gallery/lexicon/id.json' with { type: 'json' }

/** One banned needle: a regular-expression source (applied with the `i` and `g` flags). */
export type BannedTerm = {
  /** The needle, as a RegExp source; ASCII, lowercase (the scan matches case-insensitively). */
  readonly pattern: string
  /** The term's plain spelling, for the failure list. */
  readonly label: string
  /** Why it is banned — EXPERIENCE-GALLERY.md §12 "Deliberately absent". */
  readonly reason: string
}

const ABSENT = 'EXPERIENCE-GALLERY.md §12 (deliberately absent)'

/** The words a visitor must never read, EN and ID (the ticket's list). */
export const BANNED_WORDS: readonly BannedTerm[] = [
  { pattern: '\\bcart\\b', label: 'cart', reason: `${ABSENT}: no shopping cart` },
  { pattern: '\\bbasket\\b', label: 'basket', reason: `${ABSENT}: no shopping basket` },
  // `bag` only as a shopping word — a bare "bag" in a story's prose is not commerce (the ticket).
  { pattern: 'add\\s+to\\s+bag', label: 'add to bag', reason: `${ABSENT}: no bag` },
  { pattern: 'your\\s+bag', label: 'your bag', reason: `${ABSENT}: no bag` },
  { pattern: 'checkout', label: 'checkout', reason: `${ABSENT}: no checkout` },
  { pattern: 'check\\s+out', label: 'check out', reason: `${ABSENT}: no checkout` },
  { pattern: 'sign\\s+in', label: 'sign in', reason: `${ABSENT}: no accounts, no sign-in` },
  { pattern: 'log\\s+in', label: 'log in', reason: `${ABSENT}: no accounts, no sign-in` },
  { pattern: '\\blogin\\b', label: 'login', reason: `${ABSENT}: no accounts, no sign-in` },
  { pattern: 'my\\s+account', label: 'my account', reason: `${ABSENT}: no accounts` },
  { pattern: '\\bregister\\b', label: 'register', reason: `${ABSENT}: no accounts` },
  // Indonesian.
  { pattern: '\\bkeranjang\\b', label: 'keranjang', reason: `${ABSENT}: ID for cart` },
  { pattern: '\\bmasuk\\b', label: 'masuk', reason: `${ABSENT}: ID for sign-in` },
  { pattern: '\\bdaftar\\b', label: 'daftar', reason: `${ABSENT}: ID for register` },
  { pattern: '\\bbayar\\b', label: 'bayar', reason: `${ABSENT}: ID for pay` },
  // Buying.
  { pattern: '\\bbuy\\b', label: 'buy', reason: `${ABSENT}: the gallery does not sell online` },
  { pattern: '\\bbeli\\b', label: 'beli', reason: `${ABSENT}: ID for buy` },
  {
    pattern: 'add\\s+to\\b',
    label: 'add to',
    reason: `${ABSENT}: no add-to-cart/offer affordance`,
  },
  // Offers.
  { pattern: 'make\\s+an\\s+offer', label: 'make an offer', reason: `${ABSENT}: no online offers` },
  { pattern: '\\boffer\\b', label: 'offer', reason: `${ABSENT}: no online offers` },
  { pattern: '\\bpenawaran\\b', label: 'penawaran', reason: `${ABSENT}: ID for offer` },
  // Price: allowed only inside `ALLOWED_PRICE_PHRASES`, which the scan masks first.
  { pattern: '\\bprice\\b', label: 'price', reason: 'price shows only as "Price on request"' },
  {
    pattern: '\\bharga\\b',
    label: 'harga',
    reason: 'ID: price shows only as "Harga atas permintaan"',
  },
  // Any currency figure.
  {
    pattern: '\\b(Rp|IDR|SGD|S\\$|USD|US\\$|\\$)\\s?\\d',
    label: 'currency figure',
    reason: `${ABSENT}: the gallery shows no price at all`,
  },
]

/** Link targets a gallery page must never carry (the ticket). */
export const BANNED_HREFS: readonly BannedTerm[] = [
  {
    pattern: '/(^|\\/)(bag|checkout|account|admin)(\\/|$|[?#])',
    label: 'href → /bag|/checkout|/account|/admin',
    reason: `${ABSENT}: no link to the shop's commerce or the admin`,
  },
]

/**
 * Policy sentences that name the price without showing one, allowed by the owner's proxy on
 * 2026-10-06 (TASKS.md Decisions): the sold-record line ("never its price"), the enquiry line
 * ("provenance and price") and the shipping line ("after we agree the price"). Read from the
 * lexicon by key, so a reworded sentence is scanned again rather than silently allowed.
 */
const ALLOWED_POLICY_KEYS = [
  'home.gallery.recentlyBody',
  'home.gallery.enquireBody',
  'item.shipping',
] as const

function lexiconValues(lexicon: Record<string, string>): string[] {
  return ALLOWED_POLICY_KEYS.map((key) => {
    const value = lexicon[key]
    if (typeof value !== 'string') throw new Error(`gallery lexicon has no ${key}`)
    return value.toLowerCase()
  })
}

/** The price wording the gallery is allowed to render; masked out before `price` / `harga` run. */
export const ALLOWED_PRICE_PHRASES: readonly string[] = [
  ...lexiconValues(galleryEn as Record<string, string>),
  ...lexiconValues(galleryId as Record<string, string>),
  'price on request',
  'harga atas permintaan',
  // The Sell-to-us page: the gallery buys FROM the visitor; it sells nothing online.
  (galleryEn as Record<string, string>)['sellToUs.lede']!,
]

/** The element attributes the scan reads (ticket: href, aria-label, title, alt, placeholder, value). */
export const ATTRIBUTES: readonly string[] = [
  'href',
  'aria-label',
  'title',
  'alt',
  'placeholder',
  'value',
]

/** The internal field that must never reach the rendered HTML (ticket step 3). */
export const BANNED_INTERNAL = 'askingPrice'
