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
import { idSchema } from './primitives'

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
  social: z.partialRecord(z.enum(SOCIAL_NETWORKS), z.url()).default({}),
  announcement: localisedTextSchema.nullable().default(null),
  navigation: z
    .strictObject({ header: z.array(navItemSchema), footer: z.array(navItemSchema) })
    .prefault({ header: [], footer: [] }),
})
export type IdentityConfig = z.infer<typeof identitySchema>

/**
 * A sister brand (BRANDS.md §5): copy with provenance through its signed archive API,
 * never a cross-database join. `name` is what cross-links display — identity arrives from
 * config, so no brand name sits in engine code.
 */
export const sisterSchema = z.strictObject({
  slug: idSchema,
  name: z.string().min(1),
  /** What the sister is to this brand: the origin of works, or an outlet for prints. */
  role: z.enum(['archive-origin', 'merch-outlet']),
  baseUrl: z.url(),
})
export type SisterConfig = z.infer<typeof sisterSchema>
