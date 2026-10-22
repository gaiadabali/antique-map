/** Types for `./local.mjs`, the admin roles drive's local harness. */
export type Fixtures = {
  stores: { a: { id: number; code: string }; b: { id: number; code: string } }
  users: Record<'owner' | 'editor' | 'storeA' | 'storeB', number>
}
export function localPort(): string
export function sql(query: string): string
export function fixtures(): Fixtures
