/**
 * The number of pieces in the visitor's bag, for the header's bag icon: the signed cookie read
 * the way the bag page reads it (`parseBag`: ids and quantities only), never priced or cached. An
 * absent, forged or malformed cookie is the empty bag.
 */
import 'server-only'

import { cookies } from 'next/headers'

import { BAG_COOKIE_NAME, parseBag } from '@engine/cms/shop/pricing'

import { bagCookieKey } from './read-bag'

export async function bagCount(): Promise<number> {
  const jar = await cookies()
  return parseBag(jar.get(BAG_COOKIE_NAME)?.value, bagCookieKey()).reduce(
    (sum, line) => sum + line.qty,
    0,
  )
}
