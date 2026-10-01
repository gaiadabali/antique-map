/**
 * Slugs for the discovery vocabulary — makers, places, terms, sources (TASKS.md 8.1). A slug is
 * the record's address: `/makers/valentijn`, a gazetteer path `/places/java/batavia` (C10: "a
 * place value is its gazetteer path"), a facet value `?subject=batik`, the `slug` a sister
 * snapshot carries (C12 `SnapshotMaker.slug`, `SnapshotPlace.slug`). So it is one string for
 * every locale — never localised — and in C10's segment shape, lower-case ASCII kebab-case, the
 * one spelling `href()` writes and `parsePublicPath()` reads.
 *
 * **Derived once, never re-derived** (NOW! S1, CONTENT-MODEL.md §1): the first save makes it from
 * the name, and renaming the record later leaves it alone — an address that moved with every
 * typo fix would break every link to it. An editor may still set one by hand (normalised to the
 * same shape); clearing it keeps the one it had.
 *
 * Shared: the four vocabulary collections use it (TASKS.md 8.1), and any collection whose records
 * have a non-localised address may.
 */
import type { CollectionSlug, FieldHook, PayloadRequest, TextField, Validate, Where } from 'payload'

/** C10's path-segment shape (`@engine/config/routes`' segment schema, `parse.ts`' `SLUG`). */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const SLUG_MAX_LENGTH = 96

/** Letters NFKD does not take apart into a base letter and a mark. */
const LETTERS: Readonly<Record<string, string>> = {
  ß: 'ss',
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  ł: 'l',
  đ: 'd',
  ð: 'd',
  þ: 'th',
  ı: 'i',
}

/**
 * Text → a slug: accents dropped (Suárez → suarez), apostrophes joined ('s-Gravenhage →
 * s-gravenhage), a plus spelled out (VG+ → vg-plus), every other run of non-letters one hyphen
 * (Ternate & Tidore → ternate-tidore),
 * cut at a hyphen to `SLUG_MAX_LENGTH`. Empty when nothing Latin is left (a name in another
 * script): the editor then gives one by hand, and the save says so.
 */
export function slugify(text: string): string {
  const ascii = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[ßæœøłđðþı]/g, (letter) => LETTERS[letter] ?? '')
    .replace(/['’ʼ`]/g, '')
    // A grade's plus is part of its name: VG+ and VG are two grades, never `vg` and `vg-2`.
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (ascii.length <= SLUG_MAX_LENGTH) return ascii
  const cut = ascii.slice(0, SLUG_MAX_LENGTH + 1)
  const hyphen = cut.lastIndexOf('-')
  return (hyphen > 0 ? cut.slice(0, hyphen) : cut.slice(0, SLUG_MAX_LENGTH)).replace(/-+$/, '')
}

/** `base`, else `base-2`, `base-3` … — the first `isTaken` refuses, within `attempts`. */
export async function nextFreeSlug(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
  attempts = 50,
): Promise<string | null> {
  for (let n = 1; n <= attempts; n += 1) {
    const suffix = n === 1 ? '' : `-${n}`
    const candidate = `${base.slice(0, SLUG_MAX_LENGTH - suffix.length).replace(/-+$/, '')}${suffix}`
    if (!(await isTaken(candidate))) return candidate
  }
  return null
}

export type SlugFieldOptions = {
  /** The sibling field the slug is made from on the first save (`name`, `label`, `shortCite`). */
  readonly from: string
  /** A sibling field the slug is unique within (`kind` for terms); unscoped, unique in the collection. */
  readonly scope?: string
}

type Id = number | string

function blank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim() === ''
}

/** The scope a slug is unique in, when its field holds a value (else the whole collection). */
function scopeOf(
  options: SlugFieldOptions,
  siblingData: Record<string, unknown> | undefined,
): { field: string; value: unknown } | undefined {
  if (!options.scope) return undefined
  const value = siblingData?.[options.scope]
  return value === undefined || value === null ? undefined : { field: options.scope, value }
}

function hasDrafts(req: PayloadRequest, collection: CollectionSlug): boolean {
  const versions = req.payload.collections[collection]?.config.versions
  return typeof versions === 'object' && versions !== null && Boolean(versions.drafts)
}

/**
 * Whether another document of `collection` already holds `candidate` (in the same scope) — as
 * stored, or in its latest draft: an address typed into a draft is held for that record, so it
 * is never handed to another one and the draft left unable to publish.
 */
export async function slugTaken(input: {
  req: PayloadRequest
  collection: CollectionSlug
  candidate: string
  scope?: { field: string; value: unknown }
  id?: Id
}): Promise<boolean> {
  const { req, collection, candidate, scope, id } = input
  const and: Where[] = [{ slug: { equals: candidate } }]
  if (scope) and.push({ [scope.field]: { equals: scope.value } })
  if (id !== undefined) and.push({ id: { not_equals: id } })
  const stored = await req.payload.count({ collection, overrideAccess: true, req, where: { and } })
  if (stored.totalDocs > 0) return true
  if (!hasDrafts(req, collection)) return false
  const drafted: Where[] = [{ latest: { equals: true } }, { 'version.slug': { equals: candidate } }]
  if (scope) drafted.push({ [`version.${scope.field}`]: { equals: scope.value } })
  if (id !== undefined) drafted.push({ parent: { not_equals: id } })
  const latest = await req.payload.countVersions({
    collection,
    overrideAccess: true,
    req,
    where: { and: drafted },
  })
  return latest.totalDocs > 0
}

/** Derives the slug on the first save and keeps it after; normalises one typed by hand. */
function deriveOnce(options: SlugFieldOptions): FieldHook {
  return async ({ collection, originalDoc, req, siblingData, value }) => {
    const kept = (originalDoc as { slug?: unknown } | undefined)?.slug
    if (!blank(value)) return slugify(String(value)) || String(value)
    if (!blank(kept)) return kept
    const source = siblingData?.[options.from]
    if (blank(source) || !collection) return value
    const base = slugify(String(source))
    if (base === '') return value
    const id = (originalDoc as { id?: Id } | undefined)?.id
    const scope = scopeOf(options, siblingData)
    const free = await nextFreeSlug(base, (candidate) =>
      slugTaken({ req, collection: collection.slug as CollectionSlug, candidate, scope, id }),
    )
    return free ?? base
  }
}

function validateSlug(options: SlugFieldOptions): Validate<string, unknown, unknown, TextField> {
  return async (value, { collectionSlug, id, req, siblingData }) => {
    if (blank(value)) {
      return 'Give it an address: lower-case letters, digits and hyphens (made from the name when the name is in Latin letters).'
    }
    const slug = String(value)
    if (slug.length > SLUG_MAX_LENGTH) return `Keep the address to ${SLUG_MAX_LENGTH} characters.`
    if (!SLUG_PATTERN.test(slug)) {
      return 'Use lower-case letters, digits and single hyphens only, such as "batavia" or "van-keulen".'
    }
    if (!collectionSlug) return true
    const taken = await slugTaken({
      req,
      collection: collectionSlug as CollectionSlug,
      candidate: slug,
      scope: scopeOf(options, siblingData as Record<string, unknown> | undefined),
      id: id ?? undefined,
    })
    return taken ? `Another record already has the address "${slug}". Choose another.` : true
  }
}

/** The `slug` field: indexed, unique (in its scope), made once from `from`. */
export function slugField(options: SlugFieldOptions): TextField {
  return {
    name: 'slug',
    type: 'text',
    required: true,
    index: true,
    // A scoped slug is unique with its scope, through the collection's compound index instead.
    unique: options.scope === undefined,
    maxLength: SLUG_MAX_LENGTH,
    // A duplicate gets its own address, made from its name (`-2` while the name is the same).
    hooks: { beforeValidate: [deriveOnce(options)], beforeDuplicate: [() => undefined] },
    validate: validateSlug(options),
    admin: {
      position: 'sidebar',
      description:
        'The address of its page. Made once from the name; renaming the record never changes it, so links keep working.',
    },
  }
}
