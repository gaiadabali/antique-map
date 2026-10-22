/**
 * A count is the physical count (COMMERCE.md §4; DATA.md §3; TASKS.md 3.3.b). `quantity` is what a
 * store can still sell: the units on its shelf **less** those its open orders hold — orders from
 * `pending_payment` to `waiting_driver`, whose units were taken from `quantity` when the order was
 * made but are still on the shelf until a driver collects them. Staff and the import enter what
 * they see on the shelf (`physicalCount`), and this hook stores `max(count − held, 0)`, so a
 * recount never re-sells a held unit.
 *
 * **Under the row's lock, in READ COMMITTED.** The row is locked (`FOR UPDATE`) before `held` is
 * summed, in the save's own transaction: an order being created holds that row from its atomic
 * decrement to its commit, so the count waits for it and then — a new statement, a new snapshot —
 * counts its lines as held; an order that starts after the lock waits for the count and takes from
 * the new figure. Under REPEATABLE READ the sum would read the transaction's first snapshot and
 * miss an order committed while it waited, so any other isolation level is refused.
 *
 * A count below `held` stores 0; flagging those orders for reassignment is the order code's
 * (phases 6–7; a 3.3 follow-up). The row's variant is checked against its product here too.
 */
import { sql } from '@payloadcms/db-postgres/drizzle'
import {
  APIError,
  ValidationError,
  type CollectionBeforeChangeHook,
  type FieldHook,
  type PayloadRequest,
} from 'payload'

import { pickLanguage, type Bilingual } from '../products/money'
import { HOLDING_STATUSES } from '../orders/statuses'

type Id = number | string
type StockData = {
  id: Id
  store?: unknown
  product?: unknown
  variantSku?: unknown
  quantity?: unknown
  physicalCount?: unknown
}

type Database = PayloadRequest['payload']['db']
type Session = Parameters<Database['execute']>[0]['db']
type Statement = ReturnType<typeof sql>

const idOf = (value: unknown): Id | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  const id = (value as { id?: unknown } | null | undefined)?.id
  return typeof id === 'number' || typeof id === 'string' ? id : null
}

/** A blank variant SKU is no variant: stored NULL, so `(store, product, NULL)` is one key. */
export const blankVariantIsNone: FieldHook = ({ value }) => {
  if (typeof value !== 'string') return value ?? null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function refuse(req: PayloadRequest, path: string, message: Bilingual): never {
  throw new ValidationError(
    { collection: 'stock-levels', errors: [{ path, message: pickLanguage(req, message) }], req },
    req.t,
  )
}

async function sessionOf(req: PayloadRequest): Promise<Session> {
  const { db } = req.payload
  const transactionID = req.transactionID ? await req.transactionID : undefined
  const session = transactionID === undefined ? undefined : db.sessions?.[transactionID]
  if (!session)
    throw new APIError('Entering a stock count needs a transaction: save it with one.', 500)
  return session.db as Session
}

async function rows(req: PayloadRequest, session: Session, statement: Statement) {
  const result = (await req.payload.db.execute({ db: session, sql: statement })) as {
    rows?: Array<Record<string, unknown>>
  }
  return result.rows ?? []
}

/** The units `store`'s open orders hold of `product` (and `variantSku`, or none). */
export async function heldUnits(
  req: PayloadRequest,
  session: Session,
  key: { store: Id; product: Id; variantSku: string | null },
): Promise<number> {
  const statuses = sql.join(
    HOLDING_STATUSES.map((status) => sql`${status}`),
    sql`, `,
  )
  const [row] = await rows(
    req,
    session,
    sql`SELECT COALESCE(SUM(l.qty), 0)::bigint AS held
          FROM orders o JOIN orders_lines l ON l._parent_id = o.id
         WHERE o.store_id = ${key.store} AND o.status::text IN (${statuses})
           AND l.product_id = ${key.product} AND l.variant_sku IS NOT DISTINCT FROM ${key.variantSku}`,
  )
  return Number(row?.held ?? 0)
}

/** The variant must be one of the product's when it has variants, and absent when it has none. */
async function checkVariant(req: PayloadRequest, product: Id, variantSku: string | null) {
  const doc = (await req.payload.findByID({
    collection: 'products',
    id: product,
    depth: 0,
    draft: true,
    overrideAccess: true,
    req,
    select: { variants: true },
  })) as { variants?: Array<{ sku?: string | null }> | null }
  const skus = (doc.variants ?? []).map((variant) => variant.sku).filter(Boolean)
  if (skus.length === 0 && variantSku !== null) {
    refuse(req, 'variantSku', {
      en: 'This product has no variants: leave the variant SKU empty.',
      id: 'Produk ini tidak memiliki varian: biarkan SKU varian kosong.',
    })
  }
  if (skus.length > 0 && (variantSku === null || !skus.includes(variantSku))) {
    refuse(req, 'variantSku', {
      en: `Choose one of this product’s variant SKUs: ${skus.join(', ')}.`,
      id: `Pilih salah satu SKU varian produk ini: ${skus.join(', ')}.`,
    })
  }
}

export const countToQuantity: CollectionBeforeChangeHook<StockData> = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const { physicalCount: count, ...rest } = data
  const key = (field: 'store' | 'product' | 'variantSku') =>
    field in data ? data[field] : originalDoc?.[field]
  const store = idOf(key('store'))
  const product = idOf(key('product'))
  const variantSku = (key('variantSku') as string | null | undefined) ?? null
  if (store === null) {
    refuse(req, 'store', {
      en: 'Choose the store this count is for.',
      id: 'Pilih toko untuk stok ini.',
    })
  }
  if (product === null) {
    refuse(req, 'product', {
      en: 'Choose the product this count is for.',
      id: 'Pilih produk untuk stok ini.',
    })
  }

  const keyChanged =
    operation === 'create' ||
    ['store', 'product', 'variantSku'].some(
      (field) => field in data && data[field as never] !== originalDoc?.[field as never],
    )
  if (keyChanged) await checkVariant(req, product, variantSku)

  if (count === undefined || count === null) return rest
  if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
    refuse(req, 'physicalCount', {
      en: 'Enter the count on the shelf as a whole number, 0 or more.',
      id: 'Masukkan jumlah di rak sebagai bilangan bulat, 0 atau lebih.',
    })
  }
  const session = await sessionOf(req)
  const [isolation] = await rows(
    req,
    session,
    sql`SELECT current_setting('transaction_isolation') AS level`,
  )
  if (isolation?.level !== 'read committed') {
    throw new APIError('A stock count must be saved in a READ COMMITTED transaction.', 500)
  }
  const id = idOf(originalDoc as unknown)
  if (operation === 'update' && id !== null) {
    await rows(req, session, sql`SELECT id FROM stock_levels WHERE id = ${id} FOR UPDATE`)
  }
  const held = await heldUnits(req, session, { store, product, variantSku })
  return { ...rest, quantity: Math.max(count - held, 0) }
}
