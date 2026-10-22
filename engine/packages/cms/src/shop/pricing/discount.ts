/**
 * The welcome code (TASKS.md 6.2.c; COMMERCE.md §5; CONTENT-MODEL.md §4 `discounts`): the discount
 * `site-settings.shop.welcomeDiscount` names, validated and applied by the server only.
 *
 * Two steps, because the minimum spend needs the subtotal and the once-per-buyer rule needs a
 * database read:
 *  1. `checkWelcomeCode` (async) — the code matches (case-insensitive), the discount is active,
 *     inside `startsAt`–`endsAt`, under its usage limit and, for `oncePerBuyer`, not yet used by this
 *     contact. → an `EligibleDiscount`, or a refusal.
 *  2. `applyDiscount` (pure; `quoteBag` calls it) — the minimum spend, then the amount: `percent`
 *     is the shop's one rounding (`percentOfHalfUp`), `fixed` is capped at the subtotal.
 *
 * A refusal carries a reason (for logs and tests) and a lexicon key (for the page): keys, not copy.
 * The keys are the shop lexicon's existing `codeInvalid.*` family.
 */
import { isIdr, percentOfHalfUp } from './money'

/** The narrow shape of a `discounts` record this module reads (CONTENT-MODEL.md §4). */
export type DiscountRecord = {
  /** Stored upper-case; matched case-insensitively all the same. */
  readonly code: string
  readonly kind: 'percent' | 'fixed'
  /** `percent`: a whole number 1–100. `fixed`: whole rupiah > 0. */
  readonly value: number
  /** `minSpend`: the items subtotal (before the discount) it needs; `null` for none. */
  readonly minSpendIdr: number | null
  readonly oncePerBuyer: boolean
  /** Valid from `startsAt` (inclusive) until `endsAt` (exclusive); `null` is unbounded. */
  readonly startsAt: Date | string | null
  readonly endsAt: Date | string | null
  /** `null` for unlimited. */
  readonly usageLimit: number | null
  readonly usedCount: number
  readonly active: boolean
}

/** Who is buying, as checkout step 1 collected it; at least one of the two to check `oncePerBuyer`. */
export type DiscountContact = {
  /** E.164, as the checkout schema normalises it. */
  readonly whatsapp: string | null
  readonly email: string | null
}

/**
 * Whether a paid order with discount `code` exists for this contact's WhatsApp number or email
 * (`payload-adapter.ts` has the Payload implementation). A throw propagates: it is a database fault,
 * not a refusal.
 */
export type HasBeenUsedBy = (contact: DiscountContact, code: string) => boolean | Promise<boolean>

/** A code that passed every check except the minimum spend, which needs the subtotal. */
export type EligibleDiscount = {
  readonly code: string
  readonly kind: 'percent' | 'fixed'
  readonly value: number
  readonly minSpendIdr: number | null
  /**
   * `false` while no contact is known (the bag page): `oncePerBuyer` is then still to be checked,
   * and checkout MUST call `checkWelcomeCode` again with the contact before creating the order.
   */
  readonly isBuyerChecked: boolean
}

export type DiscountRefusalReason =
  | 'unknown'
  | 'inactive'
  | 'not_started'
  | 'expired'
  | 'usage_limit'
  | 'already_used'
  | 'minimum_spend'
  | 'invalid_record'

/** Shop lexicon keys (`engine/apps/web/src/sites/shop/lexicon/{en,id}.json`). */
export type DiscountMessageKey =
  | 'codeInvalid.unknown'
  | 'codeInvalid.not-started'
  | 'codeInvalid.expired'
  | 'codeInvalid.usage-limit'
  | 'codeInvalid.already-used'
  | 'codeInvalid.minimum-spend'

/**
 * Inactive and misconfigured codes read as unknown: telling a visitor a code exists but is switched
 * off helps nobody but someone guessing codes. `already-used` is the one key the lexicon still lacks.
 */
export const DISCOUNT_MESSAGE_KEYS: Readonly<Record<DiscountRefusalReason, DiscountMessageKey>> = {
  unknown: 'codeInvalid.unknown',
  inactive: 'codeInvalid.unknown',
  invalid_record: 'codeInvalid.unknown',
  not_started: 'codeInvalid.not-started',
  expired: 'codeInvalid.expired',
  usage_limit: 'codeInvalid.usage-limit',
  already_used: 'codeInvalid.already-used',
  minimum_spend: 'codeInvalid.minimum-spend',
}

export type DiscountRefusal = {
  readonly reason: DiscountRefusalReason
  readonly messageKey: DiscountMessageKey
  /** `minimum_spend` only: the rupiah still to add, for the key's `{amount}` placeholder. */
  readonly amountIdr?: number
}

export type DiscountCheck =
  | { readonly ok: true; readonly discount: EligibleDiscount }
  | { readonly ok: false; readonly refusal: DiscountRefusal }

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,31}$/

/** The code as typed → its stored form (trimmed, upper-case), or `null` if it cannot be a code. */
export function normaliseDiscountCode(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const code = input.trim().toUpperCase()
  return CODE_PATTERN.test(code) ? code : null
}

function refuse(reason: DiscountRefusalReason, amountIdr?: number): DiscountRefusal {
  return amountIdr === undefined
    ? { reason, messageKey: DISCOUNT_MESSAGE_KEYS[reason] }
    : { reason, messageKey: DISCOUNT_MESSAGE_KEYS[reason], amountIdr }
}

function instant(value: Date | string | null): number | null | undefined {
  if (value === null) return null
  const ms = (value instanceof Date ? value : new Date(value)).getTime()
  return Number.isFinite(ms) ? ms : undefined
}

function isSaneRecord(record: DiscountRecord): boolean {
  const valueOk =
    record.kind === 'percent'
      ? Number.isSafeInteger(record.value) && record.value >= 1 && record.value <= 100
      : record.kind === 'fixed' && isIdr(record.value) && record.value > 0
  return (
    valueOk &&
    (record.minSpendIdr === null || isIdr(record.minSpendIdr)) &&
    (record.usageLimit === null || isIdr(record.usageLimit)) &&
    isIdr(record.usedCount)
  )
}

function hasContact(contact: DiscountContact | null): contact is DiscountContact {
  return contact !== null && Boolean(contact.whatsapp || contact.email)
}

/**
 * Checks `enteredCode` against the welcome discount (`null` when the site has none). Order of checks
 * — match, active, record sanity, start, end, usage limit, once per buyer — so the cheapest refusal
 * wins and `hasBeenUsedBy` is only called for an otherwise valid code.
 */
export async function checkWelcomeCode(input: {
  readonly enteredCode: unknown
  readonly welcome: DiscountRecord | null
  readonly now: Date
  /** `null` on the bag page; checkout step 3 passes the buyer's contact. */
  readonly contact: DiscountContact | null
  readonly hasBeenUsedBy: HasBeenUsedBy
}): Promise<DiscountCheck> {
  const { welcome, now, contact } = input
  const code = normaliseDiscountCode(input.enteredCode)
  if (code === null || welcome === null || normaliseDiscountCode(welcome.code) !== code) {
    return { ok: false, refusal: refuse('unknown') }
  }
  if (welcome.active !== true) return { ok: false, refusal: refuse('inactive') }
  const startsAt = instant(welcome.startsAt)
  const endsAt = instant(welcome.endsAt)
  if (!isSaneRecord(welcome) || startsAt === undefined || endsAt === undefined) {
    return { ok: false, refusal: refuse('invalid_record') }
  }
  const at = now.getTime()
  if (startsAt !== null && at < startsAt) return { ok: false, refusal: refuse('not_started') }
  if (endsAt !== null && at >= endsAt) return { ok: false, refusal: refuse('expired') }
  if (welcome.usageLimit !== null && welcome.usedCount >= welcome.usageLimit) {
    return { ok: false, refusal: refuse('usage_limit') }
  }
  const isBuyerChecked = !welcome.oncePerBuyer || hasContact(contact)
  if (welcome.oncePerBuyer && hasContact(contact) && (await input.hasBeenUsedBy(contact, code))) {
    return { ok: false, refusal: refuse('already_used') }
  }
  return {
    ok: true,
    discount: {
      code,
      kind: welcome.kind,
      value: welcome.value,
      minSpendIdr: welcome.minSpendIdr,
      isBuyerChecked,
    },
  }
}

export type AppliedDiscount =
  | { readonly ok: true; readonly discountIdr: number }
  | { readonly ok: false; readonly refusal: DiscountRefusal }

/**
 * The discount on an items subtotal: refused below the minimum spend (with the rupiah still to
 * add); otherwise `percent` rounds half-up to the rupiah ONCE, on the subtotal, and `fixed` is
 * capped at the subtotal. Never touches the delivery fee. Always 0 ≤ discount ≤ subtotal.
 */
export function applyDiscount(discount: EligibleDiscount, subtotalIdr: number): AppliedDiscount {
  if (discount.minSpendIdr !== null && subtotalIdr < discount.minSpendIdr) {
    return { ok: false, refusal: refuse('minimum_spend', discount.minSpendIdr - subtotalIdr) }
  }
  const discountIdr =
    discount.kind === 'percent'
      ? percentOfHalfUp(subtotalIdr, discount.value)
      : Math.min(discount.value, subtotalIdr)
  return { ok: true, discountIdr }
}
