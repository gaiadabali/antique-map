/**
 * A product a store still counts or an order was sold with cannot be deleted. Both point at it
 * with a NOT NULL `product_id` — a stock row so the decrement finds it, an order line so the
 * record of a sale keeps its product — so the delete would fail anyway, on a database error
 * nobody can read. This says what still points at it, and what to do instead: unpublish it, or
 * switch its variants off.
 */
import { APIError, type CollectionBeforeDeleteHook } from 'payload'

export const refuseDeleteWhileSold: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const stock = await req.payload.count({
    collection: 'stock-levels',
    overrideAccess: true,
    req,
    where: { product: { equals: id } },
  })
  const orders = await req.payload.count({
    collection: 'orders',
    overrideAccess: true,
    req,
    where: { 'lines.product': { equals: id } },
  })
  if (stock.totalDocs === 0 && orders.totalDocs === 0) return
  const parts = [
    stock.totalDocs > 0 ? `${stock.totalDocs} stock row${stock.totalDocs === 1 ? '' : 's'}` : '',
    orders.totalDocs > 0 ? `${orders.totalDocs} order${orders.totalDocs === 1 ? '' : 's'}` : '',
  ].filter(Boolean)
  throw new APIError(
    `This product still has ${parts.join(' and ')}. Unpublish it to take it off the shop instead of deleting it.`,
    409,
    null,
    true,
  )
}
