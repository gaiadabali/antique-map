/**
 * @contract C8 State machines — the shape every machine table has · owner: ARC
 *
 * Each machine is one `as const` table of rows (COMMERCE.md §6): from any of a set of states, on
 * an event, to one state, emitting a domain event, fired by the actors listed. The types below
 * read the table, so the table is the single source of truth — DOM's property tests iterate the
 * data the types come from, and a transition the table lacks cannot be written.
 *
 * "Where TypeScript allows": a status read from the database is the whole union, and from the
 * whole union almost no event is legal — so the types force the caller to narrow the status
 * first (`if (status === 'paid') …`), which is exactly the check a runtime would otherwise skip.
 *
 * What the types cannot see, the write enforces: every status change is a compare-and-set —
 * `UPDATE … SET status = $to WHERE id = $1 AND status = $from` — and must touch exactly one row,
 * made under the row's lock taken in the lock order (./transactions.ts). No row means another
 * writer moved it first: re-read under the lock and decide again, or throw and roll back — never
 * write the status blind.
 */

/** Who may fire an event: a buyer through C6, staff in the admin, the system, or a provider. */
export type Actor = 'buyer' | 'staff' | 'system' | 'provider'

/**
 * One row of a machine table. `from` lists the states it applies to; `null` is the creation of
 * the record. `emits` is the domain event name — or, for the reservation machine, one name per
 * reservation kind, because a hold expiring and a checkout lock expiring tell different people.
 */
export type TransitionRow<S extends string = string> = {
  readonly from: readonly (S | null)[]
  readonly event: string
  readonly to: S
  readonly emits: string | { readonly [kind: string]: string }
  readonly by: readonly Actor[]
}

type Rows = readonly TransitionRow[]

/** The rows that apply to state `F` (distributes: a union `F` gets the rows of each member). */
type RowsFrom<T extends Rows, F> = T[number] extends infer R
  ? R extends { readonly from: readonly (infer Fs)[] }
    ? F extends Fs
      ? R
      : never
    : never
  : never

/** The events the table allows from state `F`. For a union `F`: the events legal from EVERY member. */
export type EventsFrom<T extends Rows, F> = Exclude<
  T[number]['event'],
  F extends unknown ? Exclude<T[number]['event'], RowsFrom<T, F>['event']> : never
>

/** The state after event `E` from state `F`, read from the table. */
export type StateAfter<T extends Rows, F, E> = Extract<RowsFrom<T, F>, { readonly event: E }>['to']

/** The domain event a transition emits. */
export type EmittedBy<T extends Rows, F, E> = Extract<
  RowsFrom<T, F>,
  { readonly event: E }
>['emits']

/** The events actor `A` may fire from state `F` — what C6 exposes to a buyer, the admin to staff. */
export type EventsFromBy<T extends Rows, F, A extends Actor> =
  RowsFrom<T, F> extends infer R
    ? R extends { readonly event: infer E; readonly by: readonly (infer B)[] }
      ? A extends B
        ? E
        : never
      : never
    : never

type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (
  x: infer I,
) => void
  ? I
  : never
type IsUnion<T> = [T] extends [UnionToIntersection<T>] ? false : true

/**
 * `true` when every (state, event) pair leads to exactly one state: the machine is deterministic.
 * Each machine file asserts it over its own table.
 */
export type IsDeterministic<T extends Rows> = true extends (
  T[number] extends infer R
    ? R extends { readonly from: readonly (infer Fs)[]; readonly event: infer E }
      ? Fs extends unknown
        ? IsUnion<StateAfter<T, Fs, E>>
        : never
      : never
    : never
)
  ? false
  : true
