/**
 * `payment-events` is append-only (CONTENT-MODEL.md §4: "Nobody edits a row"; COMMERCE.md §6): it
 * is the ledger of what Midtrans said, and the webhook's idempotency rests on it — the dedupe row
 * is inserted first, in the transaction that applies the payment, and a duplicate notification
 * finds it. A row changed or removed later would let a payment apply twice, or erase the record of
 * one. Three layers, each closing a path the one above leaves open:
 *
 * 1. **Access** (`./index`): nobody — the owner included — creates, updates or deletes a row
 *    through the API. The webhook inserts with access overridden.
 * 2. **These hooks**: an update or delete is refused on every Payload path, the Local API with
 *    `overrideAccess: true` included — a job or a script cannot "tidy" the ledger either.
 * 3. **The database** (`PAYMENT_EVENTS_APPEND_ONLY_SQL`, a trigger): UPDATE, DELETE and TRUNCATE
 *    of `payment_events` fail for any session. Drizzle cannot declare a trigger, so the schema lead
 *    puts this SQL in the wave's migration (TASKS.md 3.5.a); `./payment-events.db.test.ts` applies
 *    it to a pushed database and proves it.
 *
 * Consequence: an order a payment event points at can never be deleted (its `ON DELETE SET NULL`
 * would update the event) — orders are never deleted anyway (`../orders/access`). A retention purge,
 * if counsel ever asks for one (COMPLIANCE.md §1), is a migration that drops the trigger for its
 * own statement, on the record.
 */
import { APIError, type CollectionBeforeOperationHook } from 'payload'

export const APPEND_ONLY_MESSAGE =
  'A payment event records what the payment provider said. It is never changed or deleted.'

/** Refuses an update or delete of a payment event, whoever asks and however access is set. */
export const refuseUpdateAndDelete: CollectionBeforeOperationHook = ({ args, operation }) => {
  if (operation === 'update' || operation === 'delete') {
    throw new APIError(APPEND_ONLY_MESSAGE, 403, null, true)
  }
  return args
}

/** The trigger function and triggers, for the migration's `up` (TASKS.md 3.5.a). */
export const PAYMENT_EVENTS_APPEND_ONLY_SQL = `
CREATE OR REPLACE FUNCTION payment_events_append_only() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION 'payment_events is append-only: % refused', TG_OP
    USING ERRCODE = 'restrict_violation',
          HINT = 'A payment event records what the payment provider said; insert a new one instead.';
END;
$$;

CREATE TRIGGER payment_events_no_update_or_delete
  BEFORE UPDATE OR DELETE ON payment_events
  FOR EACH ROW EXECUTE FUNCTION payment_events_append_only();

CREATE TRIGGER payment_events_no_truncate
  BEFORE TRUNCATE ON payment_events
  FOR EACH STATEMENT EXECUTE FUNCTION payment_events_append_only();
`

/** The migration's `down` for the same. */
export const PAYMENT_EVENTS_APPEND_ONLY_DOWN_SQL = `
DROP TRIGGER IF EXISTS payment_events_no_truncate ON payment_events;
DROP TRIGGER IF EXISTS payment_events_no_update_or_delete ON payment_events;
DROP FUNCTION IF EXISTS payment_events_append_only();
`
