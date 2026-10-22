/**
 * The entry of `@engine/view-models`: the view models the two sites keep — a work's record and
 * condition, fuzzy dates, dimensions, images, cards, listings, discovery and editorial pages, the
 * content blocks and the shell. Types only, bar `BLOCK_TYPES` (the block list as data). A loader
 * returns projected public fields only. Fixtures are a separate entry,
 * `@engine/view-models/fixtures`, for development and component tests — never a production read.
 */
export type * from './blocks'
export type * from './cards'
export type * from './common'
export type * from './shell'
export type * from './surfaces/discovery'
export type * from './surfaces/editorial'
export type * from './surfaces/listing'
export type * from './surfaces/record'
export type * from './surfaces/sister'

export { BLOCK_TYPES } from './blocks'
