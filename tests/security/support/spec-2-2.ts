/**
 * SECURITY.md §2.2's role table, restated as data — written from the document, not from the code,
 * so the sweep (`../access-sweep.db.test.ts`) compares the engine to the spec and not to itself.
 *
 * Cells: `A` the role may do it to any row, `S` it may, narrowed to rows it owns or may see (a
 * store's own store, the user's own account, published rows for the public), `N` it may not.
 * Columns: owner, editor, store (either store's user), anonymous.
 *
 * Where the document is silent about the anonymous column, the cell is `N` — the default is no
 * access — except the reads the document or CONTENT-MODEL.md names as public (published catalogue
 * rows, R5; the listed stores, `collections/stores/index.ts`). Those are marked `S`.
 */
export type Cell = 'A' | 'S' | 'N'
export type Op = 'read' | 'create' | 'update' | 'delete'
export const OPS: readonly Op[] = ['read', 'create', 'update', 'delete']
/** owner, editor, store, anonymous */
export type Column = readonly [Cell, Cell, Cell, Cell]
export type Row = Record<Op, Column>

const ALL_OWNER: Column = ['A', 'N', 'N', 'N']
const NOBODY: Column = ['N', 'N', 'N', 'N']
const STAFF_ALL: Column = ['A', 'A', 'N', 'N']

/** The catalogue records: all to the owner and editors; the public reads what is published. */
const CATALOGUE: Row = {
  read: ['A', 'A', 'N', 'S'],
  create: STAFF_ALL,
  update: STAFF_ALL,
  delete: STAFF_ALL,
}
/** Records only the owner and editors reach, none of it public. */
const STAFF_RECORD: Row = {
  read: STAFF_ALL,
  create: STAFF_ALL,
  update: STAFF_ALL,
  delete: STAFF_ALL,
}
/** The owner's own records: leads, partners, chat sessions, discounts, events. */
const OWNER_RECORD: Row = {
  read: ALL_OWNER,
  create: ALL_OWNER,
  update: ALL_OWNER,
  delete: ALL_OWNER,
}

export const SPEC: Record<string, Row> = {
  // users: owner all; editor and store, themselves.
  users: {
    read: ['A', 'S', 'S', 'N'],
    create: ALL_OWNER,
    update: ['A', 'S', 'S', 'N'],
    delete: ALL_OWNER,
  },
  works: CATALOGUE,
  makers: CATALOGUE,
  places: CATALOGUE,
  terms: CATALOGUE,
  pages: CATALOGUE,
  // products: store users read them too (to see what they stock and ship).
  products: { ...CATALOGUE, read: ['A', 'A', 'A', 'S'] },
  // media: store users read them; the public reads none over REST (R6), the loaders on the Local API.
  media: { ...STAFF_RECORD, read: ['A', 'A', 'S', 'N'] },
  masters: STAFF_RECORD,
  redirects: STAFF_RECORD,
  // stores: owner all, editor read, store reads its own; the public reads the listed ones.
  stores: {
    read: ['A', 'A', 'S', 'S'],
    create: ALL_OWNER,
    update: ALL_OWNER,
    delete: ALL_OWNER,
  },
  // stock-levels: owner all; editor read and update; store reads its rows and updates its counts.
  'stock-levels': {
    read: ['A', 'A', 'S', 'N'],
    create: ALL_OWNER,
    update: ['A', 'A', 'S', 'N'],
    delete: ALL_OWNER,
  },
  // orders: owner all; editor read all and move any; store reads and moves its own store's.
  orders: {
    read: ['A', 'A', 'S', 'N'],
    create: ALL_OWNER,
    update: ['A', 'A', 'S', 'N'],
    delete: ALL_OWNER,
  },
  // payment-events: the owner reads; written only by the webhook.
  'payment-events': { read: ALL_OWNER, create: NOBODY, update: NOBODY, delete: NOBODY },
  partners: OWNER_RECORD,
  leads: OWNER_RECORD,
  'chat-sessions': OWNER_RECORD,
  discounts: OWNER_RECORD,
  events: OWNER_RECORD,
}

/** Collections the table does not list: nobody reaches them over REST (the ledger the core writes). */
export const NOT_IN_TABLE: Record<string, Row> = {
  'order-notifications': { read: NOBODY, create: NOBODY, update: NOBODY, delete: NOBODY },
  'payload-kv': { read: NOBODY, create: NOBODY, update: NOBODY, delete: NOBODY },
}

/**
 * Where the engine is deliberately STRICTER than the table — each a write the table's "all" would
 * allow and the code refuses on purpose, with the file that says why. A cell here must still be
 * refused (the sweep checks it); a looser answer than the spec is never listed, only fixed.
 */
export const STRICTER_THAN_TABLE: ReadonlyArray<{
  collection: string
  who: 'owner' | 'editor'
  op: Op
  why: string
}> = [
  {
    collection: 'orders',
    who: 'owner',
    op: 'create',
    why: 'an order is written only by the server order code (collections/orders/access.ts): a POSTed body would be a price taken from a request',
  },
  {
    collection: 'orders',
    who: 'owner',
    op: 'delete',
    why: 'an order is never deleted: the ledger, the stock and the buyer’s tracking link point at it (collections/orders/access.ts)',
  },
  {
    collection: 'events',
    who: 'owner',
    op: 'update',
    why: 'the event log is append-only (collections/events)',
  },
  {
    collection: 'events',
    who: 'owner',
    op: 'delete',
    why: 'the event log is append-only; retention deletes with a system call (collections/events)',
  },
  {
    collection: 'masters',
    who: 'editor',
    op: 'delete',
    why: 'a master is the irreplaceable capture; only the owner deletes one (collections/masters/access.ts)',
  },
]
