/**
 * @contract C1 — the accounts vocabulary · owner: ARC · entry: `@engine/config/schema`
 *
 * Who may hold an account is a pair of modules (`./modules`): `accounts.buyers` opens sign-up
 * to buyers (the gallery's collectors); `accounts.retailers` admits retailers only, by an
 * application staff approve (D31) — a shop with the second and not the first has no shopper
 * account at all, and its shoppers buy as guests. A retailer's standing is declared once
 * here, the leaf SCH's `customers.retailerStatus` select, C8's retailer machine
 * (`@engine/domain/machines/retailer`, which moves it: the applicant applies, or applies
 * again after a decline; staff decide the rest) and the view models (C2) all read. An
 * approved retailer's price tier is `commerce.trade`'s (`./commerce`).
 */
import { z } from 'zod'

/**
 * `applied` — waiting on staff (no password yet: approval emails a set-password link);
 * `approved` — trade terms and prices visible to this retailer alone (D32);
 * `declined` — the application refused, or the partnership ended. Only `approved` ever sees a
 * trade price.
 */
export const RETAILER_STATUSES = ['applied', 'approved', 'declined'] as const
export const retailerStatusSchema = z.enum(RETAILER_STATUSES)
export type RetailerStatus = z.infer<typeof retailerStatusSchema>
