/**
 * @contract C2 + C4 — the entry of `@engine/view-models` · owner: ARC · consumers: WEB, UXG, UXE, SEO, SCH
 *
 * Every view model, the content-block union and the loader signatures, from one module
 * (PARALLEL-TRACKS.md §4). Types only, bar `BLOCK_TYPES` (the frozen block list as data, for
 * SCH's registry test). Fixtures are a separate entry, `@engine/view-models/fixtures`, for
 * development, the style guides and component tests — never for a production read.
 */
export type * from './blocks'
export type * from './cards'
export type * from './commerce'
export type * from './common'
export type * from './loaders'
export type * from './shell'
export type * from './surfaces/account'
export type * from './surfaces/cart'
export type * from './surfaces/checkout'
export type * from './surfaces/discovery'
export type * from './surfaces/editorial'
export type * from './surfaces/form'
export type * from './surfaces/gift-card'
export type * from './surfaces/item'
export type * from './surfaces/listing'
export type * from './surfaces/order'
export type * from './surfaces/pay'
export type * from './surfaces/purchase'
export type * from './surfaces/status'

export { BLOCK_TYPES } from './blocks'
