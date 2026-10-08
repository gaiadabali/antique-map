/**
 * Retiring the 80 mock products (task 10.6.e). The importer cannot do it: a product row's
 * `active` is read by nothing (a product has no such field; `import/plan-shop.ts`), a variant
 * row's `active` is read by nothing either (`asVariantRow` keeps it on), and a key-only product
 * row is refused for its empty name, category and price. A variant being off sale does not hide
 * a product either: the shop lists every published product. What takes a product out of the
 * listing, search and every public read is leaving `published`, so this step unpublishes each
 * mock product and switches its variants off sale. Stock rows and stores stay.
 *
 * Idempotent: a product already a draft with every variant off sale is left alone.
 */
import type { Payload, RequestContext } from 'payload'

import { reqOf } from '../req'

export type RetireReport = {
  /** Mock products unpublished (and their variants taken off sale) by this run. */
  retired: number
  /** Mock products already retired, or not on this database. */
  alreadyRetired: number
}

type Variant = { id?: string; sku?: string; label?: string; price?: number; active?: boolean }
type Doc = { id: number; _status?: string; variants?: Variant[] | null }

export async function retireMockProducts(
  payload: Payload,
  skus: readonly string[],
  context: RequestContext | undefined,
): Promise<RetireReport> {
  const report: RetireReport = { retired: 0, alreadyRetired: 0 }
  for (let start = 0; start < skus.length; start += 100) {
    const { docs } = await payload.find({
      collection: 'products',
      overrideAccess: true,
      req: reqOf(payload, 'en', context),
      depth: 0,
      limit: 100,
      where: { sku: { in: skus.slice(start, start + 100) } },
    })
    for (const doc of docs as unknown as Doc[]) {
      const variants = doc.variants ?? []
      const done = doc._status === 'draft' && variants.every((variant) => variant.active === false)
      if (done) {
        report.alreadyRetired += 1
        continue
      }
      await payload.update({
        collection: 'products',
        id: doc.id,
        data: {
          _status: 'draft',
          variants: variants.map((variant) => ({ ...variant, active: false })),
        } as never,
        req: reqOf(payload, 'en', context),
      })
      report.retired += 1
    }
    report.alreadyRetired += Math.min(100, skus.length - start) - docs.length
  }
  return report
}
