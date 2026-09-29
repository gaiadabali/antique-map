/**
 * The editorial globals, parsed part by part (`./globals`). What the reader hands over is a
 * CMS document — Payload adds `id`, `globalType`, `createdAt`, `updatedAt`, an `id` on every
 * array row, and `null` for every field left empty — so unknown keys are stripped, `null` and
 * `''` read as "not set", and each part stands or falls alone: a bad e-mail address never
 * costs the site its menu.
 */
import { z } from 'zod'

import { SOCIAL_NETWORKS, localisedTextSchema, navItemSchema, type NavItem } from '../schema'

export const EDITORIAL_PARTS = [
  'contact',
  'social',
  'announcement',
  'navigation.header',
  'navigation.footer',
] as const
export type EditorialPart = (typeof EDITORIAL_PARTS)[number]

/** A link an editor types opens only over https: never `javascript:`, never plain http. */
const httpsUrl = z.url({ protocol: /^https$/ })

const navRows = z.array(z.object(navItemSchema.shape))

const PART_SCHEMAS = {
  contact: z.object({
    email: z.email().optional(),
    whatsapp: z.e164().optional(),
    phone: z.e164().optional(),
  }),
  social: z.object(
    Object.fromEntries(SOCIAL_NETWORKS.map((network) => [network, httpsUrl.optional()])) as Record<
      (typeof SOCIAL_NETWORKS)[number],
      z.ZodOptional<typeof httpsUrl>
    >,
  ),
  announcement: localisedTextSchema,
  'navigation.header': navRows,
  'navigation.footer': navRows,
} as const satisfies Record<EditorialPart, z.ZodType>

export type EditorialOverrides = {
  contact?: { email?: string; whatsapp?: string; phone?: string }
  social?: Partial<Record<(typeof SOCIAL_NETWORKS)[number], string>>
  announcement?: z.infer<typeof localisedTextSchema>
  'navigation.header'?: NavItem[]
  'navigation.footer'?: NavItem[]
}

export type ParsedGlobals = {
  readonly overrides: EditorialOverrides
  /** A reason per part that was present and refused. */
  readonly refused: readonly { readonly part: EditorialPart; readonly why: string }[]
}

/** Each part that is present, parsed on its own; `null` when the payload is not an object. */
export function parseEditorialGlobals(raw: unknown): ParsedGlobals | null {
  if (!isPlainObject(raw)) return null
  const navigation = isPlainObject(raw.navigation) ? raw.navigation : {}
  const values: Record<EditorialPart, unknown> = {
    contact: raw.contact,
    social: raw.social,
    announcement: raw.announcement,
    'navigation.header': navigation.header,
    'navigation.footer': navigation.footer,
  }
  const overrides: Record<string, unknown> = {}
  const refused: { part: EditorialPart; why: string }[] = []
  for (const part of EDITORIAL_PARTS) {
    const value = compact(values[part])
    if (value === undefined) continue
    const parsed = PART_SCHEMAS[part].safeParse(value)
    if (parsed.success) {
      overrides[part] = parsed.data
    } else {
      const issues = parsed.error.issues.map((issue) => {
        const at = issue.path.filter((key) => typeof key !== 'symbol').join('.')
        return `${at === '' ? part : `${part}.${at}`}: ${issue.message}`
      })
      refused.push({ part, why: issues.join('; ') })
    }
  }
  return { overrides: overrides as EditorialOverrides, refused }
}

/** `null`, `''` and `undefined` dropped, all the way down; `undefined` when nothing is left. */
function compact(value: unknown): unknown {
  if (value === null || value === '' || value === undefined) return undefined
  if (Array.isArray(value)) return value.map(compact).filter((each) => each !== undefined)
  if (!isPlainObject(value)) return value
  const entries = Object.entries(value)
    .map(([key, each]) => [key, compact(each)] as const)
    .filter(([, each]) => each !== undefined)
  return Object.fromEntries(entries)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
