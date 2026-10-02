/**
 * The accounts vocabulary · entry: `@engine/config/schema`
 *
 * Who may hold an account is a pair of modules (`./modules`): `accounts.buyers` opens sign-up
 * to buyers (the gallery's collectors); `accounts.retailers` admits retailers only, by an
 * application staff approve (D31) — a shop with the second and not the first has no shopper
 * account at all, and its shoppers buy as guests. A retailer's standing is declared once
 * here, the leaf SCH's `customers.retailerStatus` select, C8's retailer machine
 * (`@engine/domain/machines/retailer`, which moves it: the applicant applies, or applies
 * again after a decline; staff decide the rest) and the view models (C2) all read. An
 * approved retailer's price tier is `commerce.trade`'s (`./commerce`). Staff are Payload
 * users with one of `STAFF_ROLES` (ARCHITECTURE.md §12), never customers.
 */
import { z } from 'zod'

/**
 * `applied` — waiting on staff, with no password (approval emails a set-password link);
 * `approved` — the only status that signs in, and sees trade terms and prices, its own (D32);
 * `declined` — the application refused;
 * `ended` — a partnership staff ended (D34): the account is deactivated — no sign-in, its
 * password cleared, its sessions revoked — and its orders and history stay with the owner.
 * A declined or ended business may apply again. Sign-in answers every status but `approved` as
 * it answers an unknown email (C13 `AUTH_OPERATIONS`).
 */
export const RETAILER_STATUSES = ['applied', 'approved', 'declined', 'ended'] as const
export const retailerStatusSchema = z.enum(RETAILER_STATUSES)
export type RetailerStatus = z.infer<typeof retailerStatusSchema>

/**
 * Staff roles (ARCHITECTURE.md §12), SCH's `users.roles` select. `admin` is the owner's role:
 * the only one that may override the trade tiers (D33) or change what money does.
 */
export const STAFF_ROLES = [
  'admin',
  'manager',
  'cataloguer',
  'editor',
  'fulfilment',
  'analyst',
  'contributor',
] as const
export const staffRoleSchema = z.enum(STAFF_ROLES)
export type StaffRole = z.infer<typeof staffRoleSchema>
