/**
 * @contract C5–C8 shared — compile-time assertion helpers · owner: ARC
 *
 * The contract files prove their own invariants with these (PARALLEL-TRACKS.md §4). They are
 * type-level only: nothing here exists at runtime, so a type-only module can use them freely.
 */

/** Resolves only for exactly `true`: `Assert<false>` is a compile error. */
export type Assert<T extends true> = T

/**
 * Exact type equality, `readonly` included (the deferred-conditional trick): `Equals<A, B>` is
 * `true` only when neither type can be told apart from the other by any assignment.
 */
export type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

/** `true` when each type is assignable to the other (TypeScript ignores `readonly` here). */
export type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

/**
 * `U`, checked against `T`: `Accepts<T, U>` fails to compile when a `U` is not a `T`. The contract
 * files pair it with `// @ts-expect-error` to prove an illegal shape is rejected.
 */
export type Accepts<T, U extends T> = U

/** `true` when key `K` of `T` is readonly. */
export type IsReadonly<T, K extends keyof T> = Equals<
  { readonly [P in K]: T[P] },
  { [P in K]: T[P] }
>
