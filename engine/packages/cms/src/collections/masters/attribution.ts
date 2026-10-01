/**
 * Whose a master is (DEPLOYMENT.md §2; ARCHITECTURE.md §7; TASKS.md 8.3.c, 8.3.f): the archive's
 * origin keeps every capture — its own works', and its sister outlet's showroom and room-plate
 * captures under the outlet's intake key — while each brand keeps its own print files, under
 * `print-files/<its slug>/`. The bucket's policies say the same for the keys
 * (`@engine/media/storage` policies); this says it for the records, on every write path, so an
 * outlet's database never records a capture as its own and no brand records another's print file.
 *
 * An outlet references a capture by its key, from the C12 snapshot — never by a record.
 */
import type { BrandConfig } from '@engine/config/schema'
import { PRINT_FILES_PREFIX } from '@engine/media/contract'
import { ValidationError, type CollectionBeforeValidateHook } from 'payload'

import { activeBrand } from '../../access/brand'
import type { FieldProblem } from './validators'

export type Brand = Pick<BrandConfig, 'slug' | 'sisters'>
export type BrandReader = () => Brand | null

/** A brand whose sister is the archive's origin is an outlet: it writes print files only. */
export function isOutlet(brand: Brand): boolean {
  return brand.sisters.some((sister) => sister.role === 'archive-origin')
}

/** The brands whose captures this origin keeps: its own, and its sisters'. */
export function keptBrands(brand: Brand): string[] {
  return [brand.slug, ...brand.sisters.map((sister) => sister.slug)]
}

type Attributed = {
  readonly kind?: unknown
  readonly storageKey?: unknown
  readonly brand?: unknown
}

/**
 * Why `record` cannot be this process's — `brand`, the brand it serves (null in a CLI with no
 * brand, where only the key's own consistency is checked) — or none.
 */
export function attributionProblems(record: Attributed, brand: Brand | null): FieldProblem[] {
  const problems: FieldProblem[] = []
  const owner = typeof record.brand === 'string' ? record.brand : ''
  if (record.kind === 'capture' && brand) {
    if (isOutlet(brand)) {
      problems.push({
        path: 'kind',
        message: "This brand keeps no captures: they are its sister archive's, referenced by key.",
      })
    } else if (!keptBrands(brand).includes(owner)) {
      problems.push({ path: 'brand', message: `This archive keeps no captures of "${owner}".` })
    }
  }
  if (record.kind === 'print-file') {
    const key = typeof record.storageKey === 'string' ? record.storageKey : ''
    if (!key.startsWith(`${PRINT_FILES_PREFIX}${owner}/`)) {
      problems.push({
        path: 'storageKey',
        message: `A print file of "${owner}" is stored under ${PRINT_FILES_PREFIX}${owner}/.`,
      })
    }
    if (brand && owner !== brand.slug) {
      problems.push({ path: 'brand', message: `This brand records its own print files only.` })
    }
  }
  return problems
}

/** The hook: every create and update, against the brand this process serves. */
export function checkAttribution(
  readBrand: BrandReader = activeBrand,
): CollectionBeforeValidateHook {
  return ({ data, originalDoc }) => {
    const merged = { ...(originalDoc as object | undefined), ...(data as object | undefined) }
    const problems = attributionProblems(merged as Attributed, readBrand())
    if (problems.length > 0) {
      throw new ValidationError({ collection: 'masters', errors: problems.map((p) => ({ ...p })) })
    }
    return data
  }
}

/** Why this process may not import a batch of `manifestBrand`'s captures, or null if it may. */
export function importRefusal(manifestBrand: string, brand: Brand | null): string | null {
  if (!brand) return 'Run the import with BRAND set to the archive that keeps the batch.'
  if (isOutlet(brand))
    return "This brand keeps no captures: import the batch on its sister's archive."
  if (!keptBrands(brand).includes(manifestBrand)) {
    return `This archive keeps captures of ${keptBrands(brand).join(', ')}, not "${manifestBrand}".`
  }
  return null
}
