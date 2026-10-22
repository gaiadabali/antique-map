/**
 * The fixture registry, entry `@engine/view-models/fixtures`: every kept fixture by name, each
 * typed against its view model where it is declared. Development and component tests only —
 * never a production read.
 */
import type { ShellVM } from '../shell'
import { design } from './design'
import { makerDirectory, placeDirectory } from './directory'
import * as discovery from './discovery'
import * as editorial from './editorial'
import { homeGallery, homeShop } from './home'
import { listing, listingEmpty, listingOnRequest, search } from './listing'
import { shell, shellShop } from './shell'

export const SHELL_FIXTURES = { shell, 'shell-shop': shellShop } as const satisfies Readonly<
  Record<string, ShellVM>
>

export const FIXTURES = {
  'home-gallery': homeGallery,
  'home-shop': homeShop,
  listing,
  'listing-empty': listingEmpty,
  'listing-on-request': listingOnRequest,
  search,
  design,
  maker: discovery.maker,
  'maker-directory': makerDirectory,
  place: discovery.place,
  'place-directory': placeDirectory,
  source: discovery.source,
  collection: discovery.collection,
  catalogue: discovery.catalogue,
  story: editorial.story,
  page: editorial.page,
  exhibition: editorial.exhibition,
  location: editorial.location,
  ig: editorial.ig,
  'newsletter-archive': editorial.newsletterArchive,
} as const

export type FixtureName = keyof typeof FIXTURES
