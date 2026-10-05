'use server'

/**
 * The checkout's server actions (TASKS.md 6.3.a; COMMERCE.md §3): the fee preview and the submit.
 * Every input arrives as form fields and is re-validated on the server; a price or quantity in the
 * request is never read — the lines come from the signed bag cookie and the fee and total are
 * computed here. The submit calls the merged core's `createOrder` with the raw bag cookie, the
 * bag's welcome code and the total the review showed (`expectedTotalIdr`); a refusal re-renders a
 * plain, kind sentence (`./refusal-text`), a success redirects once to the order's tracking link
 * (6.5 builds that page; a 404 there is expected for now).
 */
import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { cms } from '@engine/cms/instance'
import {
  createOrder,
  isValidPin,
  quoteCheckout,
  type CheckoutDetailsInput,
} from '@engine/cms/shop/orders'
import { BAG_COOKIE_NAME, bagCookieKeyFromEnv, parseBag } from '@engine/cms/shop/pricing'

import { CODE_COOKIE_NAME, parseCodeCookie } from '../bag/code-cookie'
import { displayFor, type BagDisplay } from '../bag/display'
import { formatRupiah } from '../../../shared/ui/price/format-rupiah'
import { checkoutText, type CheckoutText } from '../../../sites/shop/checkout/copy'
import { refusalCopy } from './refusal-text'

/** What the submit returned while it did not redirect: the words to show and the fields to mark. */
export type SubmitState = {
  readonly ok: false
  readonly message: string
  readonly fields: readonly string[]
}

/** What the fee preview returned: the server's fee and total, or the words for why not. */
export type FeeState =
  | {
      readonly ok: true
      readonly feeText: string
      readonly totalText: string
      /** The server's total, for the pay button's `expectedTotalIdr` (echoed, never computed). */
      readonly totalIdr: number
      readonly sendingFrom: string | null
    }
  | { readonly ok: false; readonly message: string }

const empty = (value: FormDataEntryValue | null): string => (typeof value === 'string' ? value : '')

const localeOf = (value: unknown): 'en' | 'id' => (value === 'id' ? 'id' : 'en')

/** The buyer-facing names for the lines a refusal names, from the published products. */
async function namer(
  lines: readonly { readonly productId: number }[],
): Promise<
  (line: { readonly productId: number; readonly variantSku: string | null }) => string | null
> {
  const display = await displayFor(lines.map((line) => line.productId))
  const byId = new Map<number, BagDisplay>(display.map((each) => [each.productId, each]))
  return (line) => byId.get(line.productId)?.name ?? null
}

const rendered = (text: CheckoutText, copy: ReturnType<typeof refusalCopy>): string =>
  copy.params === undefined ? text(copy.key) : text(copy.key, copy.params)

/**
 * The fee preview (COMMERCE.md §3): the same assignment and quote the order will use, without
 * taking stock. The client never computes a fee — it only shows what this returns.
 */
export async function quoteFeeAction(
  _prev: unknown,
  input: { readonly lat: unknown; readonly lng: unknown; readonly locale: unknown },
): Promise<FeeState> {
  const locale = localeOf(input.locale)
  const text = checkoutText(locale)
  const pin = { lat: Number(input.lat), lng: Number(input.lng) }
  if (!isValidPin(pin)) return { ok: false, message: text('checkout.problem.invalid-pin') }

  const jar = await cookies()
  const key = bagCookieKeyFromEnv()
  const quoted = await quoteCheckout(
    await cms(),
    {
      bagCookie: jar.get(BAG_COOKIE_NAME)?.value,
      pin,
      welcomeCode: parseCodeCookie(jar.get(CODE_COOKIE_NAME)?.value, key),
    },
    { bagKey: key },
  )
  if (!quoted.ok)
    return {
      ok: false,
      message: rendered(
        text,
        refusalCopy(quoted, () => null),
      ),
    }
  return {
    ok: true,
    feeText: formatRupiah(quoted.quote.deliveryIdr ?? 0),
    totalText: formatRupiah(quoted.quote.totalIdr),
    totalIdr: quoted.quote.totalIdr,
    sendingFrom:
      quoted.sendingStore.area === null
        ? null
        : text('checkout.sendingFrom', { area: quoted.sendingStore.area }),
  }
}

/** The submit: the order, in one transaction, or the refusal words. */
export async function submitOrderAction(_prev: unknown, formData: FormData): Promise<SubmitState> {
  const jar = await cookies()
  const key = bagCookieKeyFromEnv()
  const locale = localeOf(formData.get('locale'))
  const text = checkoutText(locale)

  const notes = empty(formData.get('notes'))
  const giftNote = empty(formData.get('giftNote'))
  const details: CheckoutDetailsInput = {
    contact: {
      name: empty(formData.get('name')),
      whatsapp: empty(formData.get('whatsapp')),
      email: empty(formData.get('email')),
      locale,
    },
    delivery: {
      address: empty(formData.get('address')),
      notes: notes === '' ? null : notes,
      lat: empty(formData.get('lat')),
      lng: empty(formData.get('lng')),
    },
    giftNote: giftNote === '' ? null : giftNote,
  }

  const rawExpected = empty(formData.get('expectedTotalIdr'))
  const created = await createOrder(
    await cms(),
    {
      bagCookie: jar.get(BAG_COOKIE_NAME)?.value,
      details,
      welcomeCode: parseCodeCookie(jar.get(CODE_COOKIE_NAME)?.value, key),
      expectedTotalIdr: /^\d+$/.test(rawExpected) ? Number(rawExpected) : null,
    },
    { bagKey: key },
  )

  if (created.ok) {
    // The tracking link (6.5 builds the page; a 404 there is expected for now). The token is shown
    // once, in this address — never stored.
    redirect(`/${locale}/order/${created.number}?t=${created.trackingToken}`)
  }
  const refused =
    created.refusal === 'out_of_stock'
      ? created.lines
      : created.refusal === 'no_single_store'
        ? created.missing
        : null
  const nameOf = await namer(refused ?? parseBag(jar.get(BAG_COOKIE_NAME)?.value, key))
  return {
    ok: false,
    message: rendered(text, refusalCopy(created, nameOf)),
    fields: created.refusal === 'invalid_details' ? created.fields : [],
  }
}
