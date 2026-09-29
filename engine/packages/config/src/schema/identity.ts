/**
 * @contract C1 — brand config: identity and sisters · owner: ARC · entry: `@engine/config/schema`
 *
 * Who the brand is: hostnames, and the editorial floors the `brandSettings` and
 * `navigation` globals override (BRANDS.md §3) — a missing or unreadable global falls back
 * to these, so the site never renders without contact details or a menu. Homepage bands,
 * trust badges and WhatsApp templates take their floor from the app's default composition
 * and the brand's copy files (`<brand>/site/copy`), not from here.
 */
import { z } from 'zod'

import { routeTargetSchema } from '../routes'
import { localisedTextSchema } from './locales'
import { httpsOriginSchema, httpsUrlSchema, idSchema } from './primitives'

export const domainsSchema = z.strictObject({
  /** `null` until the owner decides (and always for the synthetic `test` brand). */
  production: z.hostname().nullable(),
  staging: z.hostname().nullable(),
  /** Answer with a 301 to `production`. */
  aliases: z.array(z.hostname()).default([]),
})

/** A menu entry, resolved per locale through `href()` (C10). */
export const navItemSchema = routeTargetSchema.extend({ label: localisedTextSchema })
export type NavItem = z.infer<typeof navItemSchema>

export const SOCIAL_NETWORKS = ['instagram', 'facebook', 'tiktok', 'youtube'] as const

export const identitySchema = z.strictObject({
  contact: z.strictObject({
    email: z.email(),
    /** E.164; the number the WhatsApp buttons open and order updates come from. */
    whatsapp: z.e164().nullable().default(null),
    phone: z.e164().nullable().default(null),
  }),
  /** Rendered as links in every page: https only, so never `javascript:` or plain http. */
  social: z.partialRecord(z.enum(SOCIAL_NETWORKS), httpsUrlSchema).default({}),
  announcement: localisedTextSchema.nullable().default(null),
  navigation: z
    .strictObject({ header: z.array(navItemSchema), footer: z.array(navItemSchema) })
    .prefault({ header: [], footer: [] }),
})
export type IdentityConfig = z.infer<typeof identitySchema>

/**
 * A sister brand (BRANDS.md §5): copy with provenance through its signed archive API,
 * never a cross-database join. `name` is what cross-links display — identity arrives from
 * config, so no brand name sits in engine code. Its secrets are `SISTER_API_KEY` and
 * `SISTER_WEBHOOK_SECRET` (DEPLOYMENT.md §8), which `bootCheck()` requires whenever a sister
 * is configured; one sister per brand, so a second is a contract change that keys them by slug.
 * A sister is another brand: its `slug` is never the brand's own (3.4 senior-be #12).
 */
export const sisterSchema = z.strictObject({
  slug: idSchema,
  name: z.string().min(1),
  /** What the sister is to this brand: the origin of works, or an outlet for prints. */
  role: z.enum(['archive-origin', 'merch-outlet']),
  /**
   * The sister's **staging** site, as an https origin (`https://shop.example.com`). One committed
   * origin cannot serve two environments, so each host names the sister it syncs with in
   * `SISTER_BASE_URL` — which production requires, and never this one — and `bootCheck()` checks
   * it (`boot-check/sister.ts`, 3.4 senior-be #6); `sisterBaseUrl()` is what the sister client
   * reads, and the CSP allows. Never plain http: C12's local sister in development is named by a
   * workstation's `SISTER_BASE_URL` on loopback, never by a committed config.
   */
  baseUrl: httpsOriginSchema,
})
export type SisterConfig = z.infer<typeof sisterSchema>
