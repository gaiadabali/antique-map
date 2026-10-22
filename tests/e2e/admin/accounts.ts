/** The admin roles drive's accounts (`fixtures.ts` makes them; `roles.spec.ts` signs in as them). */

/** The buyer email that marks the fixture orders and the fixture leads. */
export const FIXTURE_EMAIL = 'e2e-fixture@example.test'
/** Every fixture account's password — the `hosts` spec's owner's, so both specs share one owner. */
export const PASSWORD = 'e2e-owner-password-0f3c9a'
export const ACCOUNTS = {
  owner: { email: 'e2e-owner@example.test', name: 'E2E Owner', role: 'owner' },
  editor: { email: 'e2e-editor@example.test', name: 'E2E Editor', role: 'editor' },
  storeA: { email: 'e2e-store-a@example.test', name: 'E2E Store A', role: 'store' },
  storeB: { email: 'e2e-store-b@example.test', name: 'E2E Store B', role: 'store' },
} as const
export type AccountKey = keyof typeof ACCOUNTS
