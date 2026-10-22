/**
 * Photographs of the owner's stores (2026-10-21: eight pictures for every store, until each store
 * has its own). Each store gets one of them, chosen by its name, so the choice looks random across
 * the page yet stays the same on every visit and every render. Imported, so Next serves them from
 * `/_next/static/media/` — a path the proxy already passes — at a hashed, long-cached address.
 */
import type { StaticImageData } from 'next/image'

import store01 from './photos/store-01.webp'
import store02 from './photos/store-02.webp'
import store03 from './photos/store-03.webp'
import store04 from './photos/store-04.webp'
import store05 from './photos/store-05.webp'
import store06 from './photos/store-06.webp'
import store07 from './photos/store-07.webp'
import store08 from './photos/store-08.webp'

const PHOTOS: readonly StaticImageData[] = [
  store01,
  store02,
  store03,
  store04,
  store05,
  store06,
  store07,
  store08,
]

/** One of the stores' photographs for `key` (the store's name and address): the same key, the same photo. */
export function storePhotoFor(key: string): StaticImageData {
  // FNV-1a: a small, even spread of names over the eight pictures.
  let hash = 0x811c9dc5
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return PHOTOS[(hash >>> 0) % PHOTOS.length] as StaticImageData
}
