/**
 * The shop home's bridge to the originals (the redesign of 2026-10-20): two of the gallery's own
 * published works with a picture. Where they come from is the app's: today's app reads its one
 * database's `works` (`apps/web/src/server/shop/home/load-originals.ts`); the shop app, on its own
 * database, asks the gallery's public read API (TASKS.md 23.5, `apps/shop/src/originals`). Each app
 * registers its reader from its shop root layout's module, which every shop page loads before it
 * renders; with none registered the home's frames hold one of the shop's own prints instead.
 */
export type OriginalVM = {
  readonly title: string
  readonly date: string | null
  readonly maker: string | null
  /** A card's lead image as the gallery exposes it to the public. */
  readonly image: {
    readonly url: string
    readonly alt: string
    readonly width: number | null
    readonly height: number | null
    readonly srcSet?: string
  }
}

export type OriginalsReader = (locale: 'en' | 'id') => Promise<readonly OriginalVM[]>

const READER = Symbol.for('@engine/storefront/originals')
type Holder = { [READER]?: OriginalsReader }

/** The app's reader of the originals; a later call replaces an earlier one. */
export function registerOriginals(reader: OriginalsReader): void {
  ;(globalThis as Holder)[READER] = reader
}

/** The originals for the home, or none: no reader registered, or one that failed. */
export async function loadOriginals(locale: 'en' | 'id'): Promise<readonly OriginalVM[]> {
  const reader = (globalThis as Holder)[READER]
  if (reader === undefined) return []
  try {
    return await reader(locale)
  } catch {
    return []
  }
}
