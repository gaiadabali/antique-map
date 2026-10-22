'use server'

/**
 * Changing the bag and its code (TASKS.md 6.2; EXPERIENCE-SHOP.md §5): the forms' server actions.
 * Each reads the signed cookie, edits with the pricing core's pure functions (`setBagLineQty`,
 * `removeFromBag`), re-signs and writes it back — the server's bag, priced again on the page's
 * re-render. Every input arrives as form fields and is re-validated; nothing a form adds beside
 * the ids is read.
 */
import 'server-only'
import { cookies } from 'next/headers'

import { cms } from '@engine/cms/instance'
import {
  BAG_COOKIE_ATTRIBUTES,
  BAG_COOKIE_NAME,
  MAX_LINE_QTY,
  bagCookieKeyFromEnv,
  checkWelcomeCode,
  hasBeenUsedByFor,
  loadPricingInputs,
  normaliseDiscountCode,
  parseBag,
  removeFromBag,
  serialiseBag,
  setBagLineQty,
  type BagCookieKey,
  type BagEdit,
  type BagLine,
} from '@engine/cms/shop/pricing'

import { addToBagChecked } from './add-to-bag'
import { CODE_COOKIE_NAME, serialiseCodeCookie } from './code-cookie'
import { formatRupiah } from '../../../shared/ui/price/format-rupiah'

/** What an edit did. `refused`: the product or chosen variant has no stock in any store. */
export type BagActionState = {
  readonly outcome: BagEdit['outcome'] | 'refused'
  /** `capped` only: the quantity a line may reach (`MAX_LINE_QTY`). */
  readonly maxQty?: number
}

/** What applying a code did. */
export type CodeActionState = {
  readonly ok: boolean
  /** The code as stored, when accepted (upper case). */
  readonly code?: string
  /**
   * `ok: false` only: the lexicon key and, for the minimum spend, the rupiah still to add —
   * both raw and formatted (the server formats, the client never computes).
   */
  readonly problem?: {
    readonly key: string
    readonly amountIdr?: number
    readonly amountText?: string
  }
}

const secure = process.env.NODE_ENV === 'production'

async function writeBag(lines: readonly BagLine[], key: BagCookieKey): Promise<void> {
  const jar = await cookies()
  jar.set(BAG_COOKIE_NAME, serialiseBag(lines, key), { ...BAG_COOKIE_ATTRIBUTES, secure })
}

/** The bag a request carries, as the server signed it; anything else is the empty bag. */
function linesOf(value: string | undefined, key: BagCookieKey): readonly BagLine[] {
  return parseBag(value ?? null, key)
}

/** One line named by a form post; anything malformed is a line the bag does not hold. */
function lineOf(formData: FormData): { productId: number; variantSku: string | null; qty: number } {
  const productId = Number(formData.get('productId'))
  const variantSku = formData.get('variantSku')
  const qty = Number(formData.get('qty'))
  return {
    productId: Number.isSafeInteger(productId) ? productId : 0,
    variantSku: typeof variantSku === 'string' && variantSku !== '' ? variantSku : null,
    qty: Number.isSafeInteger(qty) ? qty : 0,
  }
}

/**
 * Adds one line (merging the same product and variant, `addToBag`). Refuses — leaving the bag
 * unchanged — a product or variant with no stock in any store, checked live so a forced post for
 * an out-of-stock product never adds it (`addToBagChecked`).
 */
export async function addToBagAction(
  _prev: BagActionState | null,
  formData: FormData,
): Promise<BagActionState> {
  const jar = await cookies()
  const key = bagCookieKeyFromEnv()
  const payload = await cms()
  const result = await addToBagChecked(
    payload,
    linesOf(jar.get(BAG_COOKIE_NAME)?.value, key),
    lineOf(formData),
  )
  if (result.outcome === 'refused') return { outcome: 'refused' }
  await writeBag(result.lines, key)
  return {
    outcome: result.outcome,
    ...(result.outcome === 'capped' ? { maxQty: MAX_LINE_QTY } : {}),
  }
}

/** Sets one line's quantity; `0` removes the line (`setBagLineQty`). */
export async function setBagLineQtyAction(
  _prev: BagActionState | null,
  formData: FormData,
): Promise<BagActionState> {
  const jar = await cookies()
  const key = bagCookieKeyFromEnv()
  const result = setBagLineQty(linesOf(jar.get(BAG_COOKIE_NAME)?.value, key), lineOf(formData))
  await writeBag(result.lines, key)
  return {
    outcome: result.outcome,
    ...(result.outcome === 'capped' ? { maxQty: MAX_LINE_QTY } : {}),
  }
}

/** Removes one line. */
export async function removeBagLineAction(
  _prev: BagActionState | null,
  formData: FormData,
): Promise<BagActionState> {
  const jar = await cookies()
  const key = bagCookieKeyFromEnv()
  const { productId, variantSku } = lineOf(formData)
  const result = removeFromBag(linesOf(jar.get(BAG_COOKIE_NAME)?.value, key), {
    productId,
    variantSku,
    qty: 1,
  })
  await writeBag(result.lines, key)
  return { outcome: result.outcome }
}

/**
 * Applies the welcome code (S13): validated here against `discounts` (`checkWelcomeCode`, no
 * contact — the bag page cannot finish the once-per-buyer rule; checkout re-checks with it), and
 * stored normalised in its own signed cookie. An empty field clears the code.
 */
export async function applyCodeAction(
  _prev: CodeActionState | null,
  formData: FormData,
): Promise<CodeActionState> {
  const jar = await cookies()
  const key = bagCookieKeyFromEnv()
  const raw = formData.get('code')
  const typed = typeof raw === 'string' ? raw : ''
  if (typed.trim() === '') {
    jar.delete(CODE_COOKIE_NAME)
    return { ok: true }
  }
  const code = normaliseDiscountCode(typed)
  if (code === null) {
    return { ok: false, problem: { key: 'codeInvalid.unknown' } }
  }
  const payload = await cms()
  const { welcome } = await loadPricingInputs(payload, [])
  const checked = await checkWelcomeCode({
    enteredCode: code,
    welcome,
    now: new Date(),
    contact: null,
    hasBeenUsedBy: hasBeenUsedByFor(payload),
  })
  if (!checked.ok) {
    const { messageKey, amountIdr } = checked.refusal
    return {
      ok: false,
      problem: {
        key: messageKey,
        ...(amountIdr === undefined ? {} : { amountIdr, amountText: formatRupiah(amountIdr) }),
      },
    }
  }
  const value = serialiseCodeCookie(code, key)
  if (value === null) return { ok: false, problem: { key: 'codeInvalid.unknown' } }
  jar.set(CODE_COOKIE_NAME, value, { ...BAG_COOKIE_ATTRIBUTES, secure })
  return { ok: true, code }
}
