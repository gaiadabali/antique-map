/**
 * An `EvalCase`'s fixtures as a `CatalogueReader` (AI.md §6, ticket 8.4b): built the same shape as
 * `../test-support/memory.ts`'s doubles, but from one case's `works`/`products` instead of a fixed
 * catalogue, so every case runs against exactly the items its scenario names. Unlike the real
 * database, `find()` ignores the query's filters (same deliberate worst case as the test double) —
 * the case's own fixtures are already scoped to the scenario, so the scripted tool call only needs
 * to ask for enough results; the grader compares emitted card ids to `idOfFixture`.
 */
import 'server-only'

import type { CatalogueFind, CatalogueReader } from '../ports'
import type { EvalCase, FixtureProduct, FixtureWork } from './schema'

type Doc = Record<string, unknown>

function workDoc(fixture: FixtureWork, publicId: number): Doc {
  return {
    publicId,
    slug: fixture.id,
    title: fixture.title,
    objectType: 'map',
    status: fixture.status,
    date: { display: fixture.date },
    makers: fixture.maker ? [{ maker: { name: fixture.maker }, role: null }] : [],
    places: fixture.places ? [{ place: { name: fixture.places }, role: null }] : [],
    images: [],
    stockNumber: fixture.stockNumber,
    description: fixture.description ?? '',
    condition: {},
    dimensions: {},
    _status: 'published',
  }
}

function productDoc(fixture: FixtureProduct): Doc {
  return {
    id: fixture.id,
    slug: fixture.id,
    name: fixture.name,
    sku: fixture.sku,
    price: fixture.priceIdr,
    category: null,
    images: [],
    description: '',
    variants: [],
    site: 'shop',
    _status: 'published',
  }
}

/** A case's fixtures as a reader, plus the map from a fixture's id to the id the tools return. */
export class EvalReader implements CatalogueReader {
  readonly idOfFixture = new Map<string, string>()
  private readonly works: Doc[]
  private readonly products: Doc[]
  private readonly inStockIds: ReadonlySet<string>

  constructor(fixtures: EvalCase['fixtures']) {
    const works = fixtures?.works ?? []
    const products = fixtures?.products ?? []
    this.works = works.map((w, i) => {
      const publicId = i + 1
      this.idOfFixture.set(w.id, String(publicId))
      return workDoc(w, publicId)
    })
    this.products = products.map((p) => {
      this.idOfFixture.set(p.id, p.id)
      return productDoc(p)
    })
    this.inStockIds = new Set(products.filter((p) => p.inStock).map((p) => p.id))
  }

  async find(query: CatalogueFind): Promise<readonly unknown[]> {
    const all: Doc[] =
      query.collection === 'works'
        ? this.works
        : query.collection === 'products'
          ? this.products
          : []
    const json = JSON.stringify(query.where)
    const publicId = /"publicId":\{"equals":(\d+)\}/.exec(json)?.[1]
    const slug = /"slug":\{"equals":"([^"]+)"\}/.exec(json)?.[1]
    const docs = all.filter((doc) => {
      if (publicId !== undefined) return doc.publicId === Number(publicId)
      if (slug !== undefined) return doc.slug === slug
      return true
    })
    return structuredClone(docs.slice(0, query.limit))
  }

  async productsInStock(ids: readonly string[]): Promise<ReadonlySet<string>> {
    return new Set(ids.filter((id) => this.inStockIds.has(id)))
  }
}

/** The total fixture count, for a tool call's `limit` ("enough results to cover every fixture"). */
export function fixtureCount(fixtures: EvalCase['fixtures']): number {
  return (fixtures?.works?.length ?? 0) + (fixtures?.products?.length ?? 0)
}
