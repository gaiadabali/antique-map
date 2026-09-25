/**
 * @contract C1 — brand config: the look · owner: ARC · entry: `@engine/config/schema`
 *
 * BRANDS.md §1 row 3: the storefront app (the only build-time choice), the brand's assets
 * and its validated token overrides. Everything else about the look belongs to the app.
 */
import { z } from 'zod'

/** Apps are named by archetype, never by brand (BRANDS.md §2). */
export const STOREFRONTS = ['gallery', 'emporium'] as const
export type Storefront = (typeof STOREFRONTS)[number]

const assetPathSchema = z
  .string()
  .regex(/^(?!.*\.\.)\w[\w./-]*$/, 'a relative path inside <brand>/site/assets')
const hexSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'a #rrggbb colour')

/**
 * The brand-overridable token subset (DESIGN-SYSTEM.md §4); C3 re-exports it and proves it
 * a subset of the full contract. Colours are hex so the contrast gate can compute them:
 * one failing text pairing rejects the whole override and the app default renders.
 * `--font-display` is a CSS family list whose first family is declared in `assets.fonts`.
 */
export const tokenOverridesSchema = z
  .strictObject({
    '--c-accent': hexSchema,
    '--c-accent-ink': hexSchema,
    '--c-ground': hexSchema,
    '--c-ink': hexSchema,
    '--font-display': z.string().min(1),
  })
  .partial()
export type TokenOverrides = z.infer<typeof tokenOverridesSchema>
export type BrandTokenName = keyof TokenOverrides
export const BRAND_TOKEN_NAMES = Object.keys(tokenOverridesSchema.shape) as BrandTokenName[]

/**
 * Files in `<brand>/site/assets/`, served at runtime from `/brand-assets/<path>` (C13) —
 * never through `public/` or `next/font`, which are baked into a build. A licensed display
 * face loads through a runtime `@font-face` built from `fonts`.
 */
export const assetsSchema = z.strictObject({
  logo: assetPathSchema,
  /** A compact mark for tight spaces (the sister lockup, the favicon's source). */
  mark: assetPathSchema.nullable().default(null),
  favicon: assetPathSchema,
  /** The base image for generated Open Graph cards. */
  ogImage: assetPathSchema,
  fonts: z
    .array(
      z.strictObject({
        family: z.string().min(1),
        src: assetPathSchema,
        weight: z.string().default('400'),
        style: z.enum(['normal', 'italic']).default('normal'),
      }),
    )
    .default([]),
})
export type BrandAssets = z.infer<typeof assetsSchema>
