/**
 * A store still in use cannot be deleted (TASKS.md 3.3.d; the phase 2 reviews): not while a staff
 * account works in it, a stock row counts its shelf, or an order was sent from it. Each would
 * otherwise go wrong quietly or loudly — a store user left with no store sees an empty admin
 * (their reads compare with `users.store`), and a stock row or an order would fail the delete on
 * its NOT NULL `store` with a database error nobody can read. So the refusal says what still
 * points at the store, and what to do instead: an old store is retired by switching Active off.
 *
 * The hook is the plain answer; the database is the guard. A store user assigned to the store
 * while the delete runs is caught by `users_store_staff_have_a_store` (`./constraints`), and a
 * stock row or order by their NOT NULL `store_id`, whatever path deleted the store.
 */
import { APIError, type CollectionBeforeDeleteHook, type CollectionSlug } from 'payload'

/** What may point at a store, and the words for a count of each. */
const REFERENCES: ReadonlyArray<{
  collection: CollectionSlug
  one: string
  many: string
}> = [
  { collection: 'users', one: 'staff account', many: 'staff accounts' },
  { collection: 'stock-levels', one: 'stock row', many: 'stock rows' },
  { collection: 'orders', one: 'order', many: 'orders' },
]

/** "2 staff accounts and 1 order" — the parts that are not zero, joined. */
export function stillUsedMessage(counts: ReadonlyArray<{ count: number; noun: string }>): string {
  const parts = counts.filter(({ count }) => count > 0).map(({ count, noun }) => `${count} ${noun}`)
  const list =
    parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
  return `This store still has ${list}. Move the staff to another store and keep its stock and orders: to stop it taking orders, switch Active off instead of deleting it.`
}

export const refuseDeleteWhileUsed: CollectionBeforeDeleteHook = async ({ id, req }) => {
  // One at a time: the counts share the delete's transaction, and so its one connection.
  const counts: Array<{ count: number; noun: string }> = []
  for (const { collection, one, many } of REFERENCES) {
    const { totalDocs } = await req.payload.count({
      collection,
      overrideAccess: true,
      req,
      where: { store: { equals: id } },
    })
    counts.push({ count: totalDocs, noun: totalDocs === 1 ? one : many })
  }
  if (counts.every(({ count }) => count === 0)) return
  throw new APIError(stillUsedMessage(counts), 409, null, true)
}
