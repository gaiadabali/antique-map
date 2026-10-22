/**
 * The maker page's view models (5.4.a; EXPERIENCE-GALLERY.md §7): name with life dates and roles,
 * a biography (not in the collection yet — `../../../../../../packages/cms/src/collections/makers`
 * says why: it lands with blocks, TASKS.md 9.3.a), then the works, available first, then sold.
 */
import type { CardImage, WorkCardVM } from '../catalogue/view-models'

export type MakerVM = {
  readonly id: number
  readonly name: string
  readonly sortName: string
  readonly slug: string
  readonly roles: readonly string[]
  /** Life dates as the record reads them (`date-reading`'s own words); `null` when unset. */
  readonly bornText: string | null
  readonly diedText: string | null
  readonly nationality: string | null
  readonly portrait: CardImage | null
  readonly sameAs: readonly string[]
  readonly available: readonly WorkCardVM[]
  readonly sold: readonly WorkCardVM[]
}

/** One row of the makers index: name, life dates and a count of the maker's published works. */
export type MakerIndexItemVM = {
  readonly slug: string
  readonly name: string
  readonly bornText: string | null
  readonly diedText: string | null
  readonly workCount: number
}
