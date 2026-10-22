/**
 * Whether an order holds its units on its store's shelf (COMMERCE.md §4, §13; TASKS.md 10.7.b).
 *
 * Every order in a holding status (`awaiting_quote` … `waiting_driver`) took its units from its
 * store when it was made — except one: an order paid after it expired, whose store no longer held
 * every unit (`../payments/late-payment`). It is `paid`, because the money is in, but it holds
 * nothing, and the moves that give units back must know: a cancel would put units on a shelf that
 * never had them, and a reassign would hand the first store units it never gave.
 *
 * There is no column for it (no schema change in 10.7): the order's own history says so. The
 * late payment writes its `expired → paid` row with a note that starts with `UNITS_GONE_NOTE`; a
 * reassign that later takes the units at another store writes one that starts with
 * `UNITS_TAKEN_NOTE`. The order holds its units unless it has more of the first than the second.
 * Both notes are written only by the server's code (`orders.history` is `SERVER_ONLY`), read
 * under the order's lock, inside the caller's transaction.
 */
import { sql, wholeOf, type Tx } from '../payments/transaction'

/** The start of the late payment's history note when the store no longer held every unit. */
export const UNITS_GONE_NOTE =
  'Paid after expiry; its store no longer held every unit, so none were taken.'

/** The start of a reassign's history note when it took the units of an order that held none. */
export const UNITS_TAKEN_NOTE = 'Units taken at the new store (the order held none).'

/** False only for an order paid after expiry whose units are not (yet) taken anywhere. */
export async function holdsUnits(tx: Tx, orderId: number): Promise<boolean> {
  const [row] = await tx.rows(sql`
    SELECT count(*) FILTER (WHERE left(note, ${UNITS_GONE_NOTE.length}) = ${UNITS_GONE_NOTE}) AS gone,
           count(*) FILTER (WHERE left(note, ${UNITS_TAKEN_NOTE.length}) = ${UNITS_TAKEN_NOTE}) AS taken
      FROM orders_history WHERE _parent_id = ${orderId}`)
  return wholeOf(row?.gone ?? 0, 'gone notes') <= wholeOf(row?.taken ?? 0, 'taken notes')
}
