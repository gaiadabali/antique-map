'use server'

/**
 * The checkout's server actions (TASKS.md 6.3.a, 6.6.c; COMMERCE.md §3): the submit only — there
 * is no fee preview any more (COMMERCE.md's 2026-10-06 decision: staff quote the delivery fee
 * after the order is placed, so checkout never shows one). Every input arrives as form fields and
 * is re-validated on the server; a price or quantity in the request is never read — the lines come
 * from the signed bag cookie and the total is computed here. The submit calls the merged core's
 * `createOrder` with the raw bag cookie, the bag's welcome code and the items total the review
 * showed (`expectedTotalIdr`, items minus discount — there is no fee to add yet); a refusal
 * re-renders a plain, kind sentence (`./refusal-text`), a success redirects once to the order's
 * tracking link, now in its `awaiting_quote` state (6.5). The "order confirming" email is the
 * core's to send (`notifyOrderEvent`, 6.6-core) — this action no longer sends one itself.
 */
import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { cms } from '@engine/cms/instance'
import { createOrder, type CheckoutDetailsInput } from '@engine/cms/shop/orders'
import { BAG_COOKIE_NAME, bagCookieKeyFromEnv, parseBag } from '@engine/cms/shop/pricing'

import { CODE_COOKIE_NAME, parseCodeCookie } from '../bag/code-cookie'
import { displayFor, type BagDisplay } from '../bag/display'
import { siteHref } from '../../../shell/site'
import { checkoutText, type CheckoutText } from '../../../sites/shop/checkout/copy'
import { refusalCopy } from './refusal-text'

/** What the submit returned while it did not redirect: the words to show and the fields to mark. */
export type SubmitState = {
  readonly ok: false
  readonly message: string
  readonly fields: readonly string[]
}

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
    // The "we're confirming your delivery price" email is the core's to send, after its own
    // transaction commits (`notifyOrderEvent`, 6.6-core) — never this action's job. The token is
    // shown once, in this address — never stored.
    redirect(siteHref('shop')('order', { token: created.trackingToken }, locale))
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
