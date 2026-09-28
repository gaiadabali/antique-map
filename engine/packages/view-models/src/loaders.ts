/**
 * @contract C2 — the loader signatures · owner: ARC · consumers: WEB (implements `@engine/loaders`), UXG, UXE
 *
 * One loader per surface (DESIGN-SYSTEM.md §2–3): an app's route resolves its params, calls
 * the loader and renders its own surface component — it never queries, prices or names a
 * brand. `@engine/loaders` implements this map twice (TASKS.md 11.3): from Payload, through
 * the one read helper that always passes `overrideAccess: false`, `_status: 'published'` and a
 * `select` (ARCHITECTURE.md §12), and from the fixtures behind `LOADERS_SOURCE=fixtures`,
 * which the boot check refuses in production. Its exports are `load` + the surface —
 * `loadItem`, `loadCart`. A loader reads cookies, the session and the ship-to market itself,
 * at request time; its params are only what the URL says.
 *
 * Two phases, because the content is cached and the viewer's parts are not (ARCHITECTURE.md
 * §9): phase one is a `'use cache'` + `cacheTag` read returning `CachedPart<VM>` (`../common`)
 * — published-only, projected, the same for every visitor; phase two creates each `Streamed`
 * part at request time, inside the route's `<Suspense>`, and the loader returns the two
 * together. A cached read never awaits a streamed part. There is no cookie-free fixed shell to
 * prerender: the `(site)` layout awaits `connection()`, so every page is rendered per request
 * and caching is per read, by tag.
 *
 * `Found<VM>`: `null` is a 404 (`notFound()`); `redirectTo` is permanent on a content page —
 * the slug changed, and the item page resolves by public id, so a product URL is never lost
 * (`permanentRedirect()`) — and temporary on a session page (`redirect()`: a checkout with
 * no bag goes to the bag; an order without access goes to the order lookup).
 */
import type {
  AccountSection,
  FormKind,
  HrefParams,
  ListingQuery,
  Surface,
} from '@engine/config/routes'
import type { LocaleCode } from '@engine/config/schema'

import type { ShellVM } from './shell'
import type { AccountVM } from './surfaces/account'
import type { CartVM } from './surfaces/cart'
import type { CheckoutVM } from './surfaces/checkout'
import type {
  CatalogueVM,
  CollectionVM,
  DesignVM,
  MakerVM,
  PlaceVM,
  SourceVM,
} from './surfaces/discovery'
import type {
  ExhibitionVM,
  HomeVM,
  IgVM,
  LocationVM,
  NewsletterArchiveVM,
  PageVM,
  StoryVM,
} from './surfaces/editorial'
import type { FormVM } from './surfaces/form'
import type { GiftCardVM } from './surfaces/gift-card'
import type { ItemVM } from './surfaces/item'
import type { DirectoryVM, ListingVM, SearchVM } from './surfaces/listing'
import type { OrderLookupVM, OrderVM } from './surfaces/order'
import type { PartnershipVM } from './surfaces/partnership'
import type { PayVM, QuoteVM } from './surfaces/pay'
import type { ErrorVM, GoneVM, NotFoundVM } from './surfaces/status'
import type { WishlistVM } from './surfaces/wishlist'
import type { CachedPart } from './common'

export type Found<VM> = { vm: VM } | { redirectTo: string } | null

type At = { locale: LocaleCode }
/** A surface whose bare segment is its index (C10 `index: true`): no slug → the directory. */
type Indexed<VM> = (p: At & { slug?: string }) => Promise<Found<VM | DirectoryVM>>

export type Loaders = {
  /** Not a surface: the `(site)` layout's. */
  shell: (p: At) => Promise<ShellVM>
  home: (p: At) => Promise<HomeVM>
  browse: (p: At & { query: ListingQuery }) => Promise<Found<ListingVM>>
  search: (p: At & { query: HrefParams['search'] }) => Promise<SearchVM>
  item: (p: At & { publicId: number; slug: string }) => Promise<Found<ItemVM>>
  design: (p: At & { slug: string }) => Promise<Found<DesignVM>>
  maker: Indexed<MakerVM>
  place: (p: At & { path: readonly string[] }) => Promise<Found<PlaceVM | DirectoryVM>>
  collection: Indexed<CollectionVM>
  source: Indexed<SourceVM>
  exhibition: Indexed<ExhibitionVM>
  location: Indexed<LocationVM>
  ig: (p: At) => Promise<IgVM | null>
  giftCard: (p: At) => Promise<GiftCardVM | null>
  newsletterArchive: Indexed<NewsletterArchiveVM>
  story: Indexed<StoryVM>
  catalogue: Indexed<CatalogueVM>
  page: (p: At & { slug: string }) => Promise<Found<PageVM>>
  cart: (p: At) => Promise<CartVM>
  checkout: (p: At) => Promise<Found<CheckoutVM>>
  /** The session or the order-access cookie opens it, never the number alone (C13). */
  order: (p: At & { number: string }) => Promise<Found<OrderVM>>
  account: (p: At & { section: AccountSection }) => Promise<Found<AccountVM>>
  form: (p: At & { kind: FormKind; item?: number; topic?: string }) => Promise<Found<FormVM>>
  pay: (p: At & { token: string }) => Promise<Found<PayVM>>
  quote: (p: At & { token: string }) => Promise<Found<QuoteVM>>
  orderLookup: (p: At) => Promise<OrderLookupVM>
  /** `null` where `accounts.retailers` is off: the page 404s. */
  partnership: (p: At) => Promise<PartnershipVM | null>
  /** `null` where `retention.deviceWishlist` is off: the page 404s. */
  wishlist: (p: At) => Promise<WishlistVM | null>
  /**
   * For `not-found.tsx`, which gets no params: `path` and `locale` come from the proxy's
   * request headers (C13 `PROXY_REQUEST_HEADERS`). A removed item's path answers `GoneVM` —
   * rendered at 404, noindex, and out of the sitemap; a real 410 is only the legacy handler's —
   * anything else `NotFoundVM`, a legacy product slug becoming the prefilled search.
   */
  notFound: (p: At & { path: string }) => Promise<NotFoundVM | GoneVM>
  error: (p: At & { reference: string | null }) => Promise<ErrorVM>
}

/** The item page's loader, as TASKS.md 1.2.b states it: `{ vm } | { redirectTo } | null`. */
export type LoadItem = Loaders['item']

type VMOf<R> = R extends { vm: infer VM } ? VM : R extends { redirectTo: string } | null ? never : R
type SurfaceLoader = Exclude<keyof Loaders, 'shell'>
/** Every surface's view model: what the fixture registry and the style guides hold. */
export type SurfaceVM = {
  [S in SurfaceLoader]: VMOf<Awaited<ReturnType<Loaders[S]>>>
}[SurfaceLoader]

// ─── Type-level tests ──────────────────────────────────────────────────────────────────────

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Assert<T extends true> = T

/**
 * Every C10 surface has a loader, and nothing else does — Gone's is the not-found loader, which
 * tells a removed item from a miss: a surface added without one fails here.
 */
type _EverySurfaceLoads = Assert<Equals<SurfaceLoader | 'gone', Surface>>
/** A cached read cannot hold a request-time part: the item's cached half has no panel. */
type _CachedItemIsContentOnly = Assert<
  Equals<Extract<keyof CachedPart<ItemVM>, 'purchase' | 'sister' | 'related' | 'reviews'>, never>
>
type _ItemAsFrozen = Assert<
  Equals<Awaited<ReturnType<LoadItem>>, { vm: ItemVM } | { redirectTo: string } | null>
>
