/**
 * The CMS-global merge seam (BRANDS.md §3, NOW! S1.3). Editorial settings — contact details,
 * social links, the announcement bar and the menus — live in CMS globals with the brand file
 * as the floor: `getBrandConfig()` lays the globals over the file, and a part that is missing,
 * unreadable, invalid or empty falls back to the file — each part on its own — AND says why in
 * the log, once per process rather than once per request. The site never renders without a
 * masthead because a global was empty or the database was down.
 *
 * This package imports no other engine package, so it never reads Payload itself: the caller
 * hands in `readGlobals` — the loaders' published-only, projected read of the `brandSettings`
 * and `navigation` globals (SCH, WEB) — and whatever it returns is untrusted until parsed
 * (`./globals-parts`). Structural settings (modules, routes, money) never come from a global.
 */
import type { BrandConfig } from '../schema'
import { collectIssues, formatIssue } from '../validate/issues'
import { checkRoutes } from '../validate/rules/routes'
import { parseEditorialGlobals, type EditorialOverrides, type EditorialPart } from './globals-parts'
import { loadBrandConfig, type LoadOptions } from './load'
import { describeError } from '../boot-check/redact'

export type GlobalsLog = (message: string) => void

export type MergedBrandConfig = {
  readonly config: BrandConfig
  /** `file` when nothing from the globals was used. */
  readonly source: 'file' | 'cms'
  /** Why each floor was kept on this call — logged only the first time it was said. */
  readonly fallbacks: readonly string[]
}

const PREFIX = 'brand config:'
const warn: GlobalsLog = (message) => console.warn(message)
/** What each log has been told already: the default log's memory is the process's. */
const said = new WeakMap<GlobalsLog, Set<string>>()

/** Lays the editorial globals over the file's floors, part by part; never throws. */
export async function mergeEditorialGlobals(
  file: BrandConfig,
  readGlobals: () => unknown,
  log: GlobalsLog = warn,
): Promise<MergedBrandConfig> {
  const fallbacks: string[] = []
  const heard = said.get(log) ?? new Set<string>()
  said.set(log, heard)
  const keep = (why: string) => {
    const message = `${PREFIX} ${why}; serving the brand file's floor`
    fallbacks.push(message)
    if (!heard.has(message)) log(message)
    heard.add(message)
  }
  let raw: unknown
  try {
    raw = await readGlobals()
  } catch (error) {
    keep(`the CMS globals could not be read (${describeError(error)})`)
    return { config: file, source: 'file', fallbacks }
  }
  if (raw === null || raw === undefined) {
    keep('no CMS globals are saved yet')
    return { config: file, source: 'file', fallbacks }
  }
  const parsed = parseEditorialGlobals(raw)
  if (!parsed) {
    keep('the CMS globals are not an object')
    return { config: file, source: 'file', fallbacks }
  }
  for (const { part, why } of parsed.refused) keep(`the CMS global's ${part} is not valid (${why})`)

  // A part the globals changed must still link where href() can build, with default-locale text.
  let overrides = parsed.overrides
  const { issues, report } = collectIssues()
  checkRoutes({ ...file, identity: overlay(file.identity, overrides) }, report)
  for (const part of ['announcement', 'navigation.header', 'navigation.footer'] as const) {
    const [head, tail] = part.split('.')
    const found = issues.filter(
      (issue) =>
        issue.path[0] === 'identity' && issue.path[1] === head && (!tail || issue.path[2] === tail),
    )
    if (found.length === 0 || overrides[part] === undefined) continue
    keep(`the CMS global's ${part} is unusable (${found.map(formatIssue).join('; ')})`)
    overrides = without(overrides, part)
  }
  const identity = overlay(file.identity, overrides)
  const changed = JSON.stringify(identity) !== JSON.stringify(file.identity)
  return {
    config: changed ? { ...file, identity } : file,
    source: changed ? 'cms' : 'file',
    fallbacks,
  }
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
  const header = over['navigation.header'] ?? []
  const footer = over['navigation.footer'] ?? []
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

function without(overrides: EditorialOverrides, part: EditorialPart): EditorialOverrides {
  const rest = { ...overrides }
  delete rest[part]
  return rest
}
