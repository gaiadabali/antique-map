/**
 * @contract C2 — the loader signatures · owner: ARC · consumers: WEB (implements `@engine/loaders`), UXG, UXE
 *
 * One loader per surface (DESIGN-SYSTEM.md §2–3): an app's route resolves its params, calls
 * the loader and renders its own surface component — it never queries, prices or names a
 * brand. `@engine/loaders` implements this map twice (TASKS.md 3.6): from Payload, through
 * the one read helper that always passes `overrideAccess: false`, `_status: 'published'` and a
 * `select` (ARCHITECTURE.md §12), and from the fixtures behind `LOADERS_SOURCE=fixtures`,
 * which the boot check refuses in production. Its exports are `load` + the surface —
 * `loadItem`, `loadCart`. A loader reads cookies, the session and the ship-to market itself,
 * at request time; its params are only what the URL says.
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
import type { PayVM, QuoteVM } from './surfaces/pay'
import type { ErrorVM, GoneVM, NotFoundVM } from './surfaces/status'

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
  /** The session or the lookupToken, never the number alone (C10 `order`). */
  order: (p: At & { number: string; lookupToken?: string }) => Promise<Found<OrderVM>>
  account: (p: At & { section: AccountSection }) => Promise<Found<AccountVM>>
  form: (p: At & { kind: FormKind; item?: number; topic?: string }) => Promise<Found<FormVM>>
  pay: (p: At & { token: string }) => Promise<Found<PayVM>>
  quote: (p: At & { token: string }) => Promise<Found<QuoteVM>>
  orderLookup: (p: At) => Promise<OrderLookupVM>
  /** `path` is what was asked for: a legacy product slug becomes the prefilled search. */
  notFound: (p: At & { path: string }) => Promise<NotFoundVM>
  gone: (p: At & { path: string }) => Promise<GoneVM>
  error: (p: At & { reference: string | null }) => Promise<ErrorVM>
}

/** The item page's loader, as TASKS.md 0.5.b states it: `{ vm } | { redirectTo } | null`. */
export type LoadItem = Loaders['item']

type VMOf<R> = R extends { vm: infer VM } ? VM : R extends { redirectTo: string } | null ? never : R
/** Every surface's view model: what the fixture registry and the style guides hold. */
export type SurfaceVM = { [S in Surface]: VMOf<Awaited<ReturnType<Loaders[S]>>> }[Surface]

// ─── Type-level tests ──────────────────────────────────────────────────────────────────────

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Assert<T extends true> = T

/** Every C10 surface has a loader, and nothing else does: a surface added without one fails here. */
type _EverySurfaceLoads = Assert<Equals<Exclude<keyof Loaders, 'shell'>, Surface>>
type _ItemAsFrozen = Assert<
  Equals<Awaited<ReturnType<LoadItem>>, { vm: ItemVM } | { redirectTo: string } | null>
>
