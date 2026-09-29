/**
 * The CMS-global merge seam (BRANDS.md §3, NOW! S1.3). Editorial settings — contact details,
 * social links, the announcement bar and the menus — live in CMS globals with the brand file
 * as the floor: `getBrandConfig()` lays the globals over the file, and a global that is
 * missing, unreadable, invalid or empty falls back to the file AND says why in the log. The
 * site never renders without a masthead because a global was empty or the database was down.
 *
 * This package imports no other engine package, so it never reads Payload itself: the caller
 * hands in `readGlobals` — the loaders' published-only, projected read of the `brandSettings`
 * and `navigation` globals (SCH, WEB) — and whatever it returns is untrusted until parsed here.
 * Structural settings (modules, routes, money) never come from a global.
 */
import { z } from 'zod'

import { SOCIAL_NETWORKS, localisedTextSchema, navItemSchema, type BrandConfig } from '../schema'
import { collectIssues, formatIssue } from '../validate/issues'
import { checkRoutes } from '../validate/rules/routes'
import { loadBrandConfig, type LoadOptions } from './load'

/** What the globals may override, each part optional: absent, null or empty keeps the floor. */
export const editorialOverridesSchema = z.strictObject({
  contact: z
    .strictObject({
      email: z.email().optional(),
      whatsapp: z.e164().nullable().optional(),
      phone: z.e164().nullable().optional(),
    })
    .optional(),
  social: z.partialRecord(z.enum(SOCIAL_NETWORKS), z.url()).optional(),
  announcement: localisedTextSchema.nullable().optional(),
  navigation: z
    .strictObject({
      header: z.array(navItemSchema).optional(),
      footer: z.array(navItemSchema).optional(),
    })
    .optional(),
})
export type EditorialOverrides = z.infer<typeof editorialOverridesSchema>

export type GlobalsLog = (message: string) => void

export type MergedBrandConfig = {
  readonly config: BrandConfig
  /** `file` when nothing from the globals was used. */
  readonly source: 'file' | 'cms'
  /** Why each floor was kept, as logged. */
  readonly fallbacks: readonly string[]
}

const PREFIX = 'brand config:'

/** Lays the editorial globals over the file's floors; never throws. */
export async function mergeEditorialGlobals(
  file: BrandConfig,
  readGlobals: () => unknown,
  log: GlobalsLog = (message) => console.warn(message),
): Promise<MergedBrandConfig> {
  const fallbacks: string[] = []
  const keep = (why: string) => {
    const message = `${PREFIX} ${why}; serving the brand file's floor`
    fallbacks.push(message)
    log(message)
  }
  let raw: unknown
  try {
    raw = await readGlobals()
  } catch (error) {
    keep(
      `the CMS globals could not be read (${error instanceof Error ? error.message : String(error)})`,
    )
    return { config: file, source: 'file', fallbacks }
  }
  if (raw === null || raw === undefined) {
    keep('no CMS globals are saved yet')
    return { config: file, source: 'file', fallbacks }
  }
  const parsed = editorialOverridesSchema.safeParse(raw)
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
    )
    keep(`the CMS globals are not valid (${issues.join('; ')})`)
    return { config: file, source: 'file', fallbacks }
  }

  const identity = overlay(file.identity, parsed.data)
  let config: BrandConfig = { ...file, identity }
  // A menu the globals changed must still link where href() can build, with default-locale text.
  const { issues, report } = collectIssues()
  checkRoutes(config, report)
  const broken = new Set(
    issues.filter((issue) => issue.path[0] === 'identity').map((issue) => String(issue.path[1])),
  )
  for (const part of broken) {
    const why = issues
      .filter((issue) => issue.path[1] === part)
      .map(formatIssue)
      .join('; ')
    keep(`the CMS global's ${part} is unusable (${why})`)
  }
  if (broken.size > 0) {
    config = {
      ...config,
      identity: {
        ...identity,
        ...(broken.has('navigation') ? { navigation: file.identity.navigation } : {}),
        ...(broken.has('announcement') ? { announcement: file.identity.announcement } : {}),
      },
    }
  }
  const changed = JSON.stringify(config.identity) !== JSON.stringify(file.identity)
  return { config, source: changed ? 'cms' : 'file', fallbacks }
}

/** The brand config with the editorial globals laid over it (`loadBrandConfig()` + the merge). */
export async function getBrandConfig(
  options: LoadOptions & { readonly readGlobals: () => unknown; readonly log?: GlobalsLog },
): Promise<BrandConfig> {
  const merged = await mergeEditorialGlobals(
    loadBrandConfig(options),
    options.readGlobals,
    options.log,
  )
  return merged.config
}

type Identity = BrandConfig['identity']

function overlay(floor: Identity, over: EditorialOverrides): Identity {
  const contact = over.contact ?? {}
  const header = over.navigation?.header ?? []
  const footer = over.navigation?.footer ?? []
  const announcement = over.announcement
  return {
    contact: {
      email: contact.email ?? floor.contact.email,
      whatsapp: contact.whatsapp ?? floor.contact.whatsapp,
      phone: contact.phone ?? floor.contact.phone,
    },
    social: { ...floor.social, ...over.social },
    announcement:
      announcement && Object.keys(announcement).length > 0 ? announcement : floor.announcement,
    navigation: {
      header: header.length > 0 ? header : floor.navigation.header,
      footer: footer.length > 0 ? footer : floor.navigation.footer,
    },
  }
}
