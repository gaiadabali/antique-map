/**
 * What a shop page receives from its route, in either app: today's app mounts these pages under
 * `app/(shop)/shop/[locale]/…`, the shop app under `app/[locale]/…` (TASKS.md 23.3), and both hand
 * the same params — the locale, a slug or a token — as Next's own `PageProps` does.
 */
type SearchParams = Promise<Record<string, string | string[] | undefined>>

export type LocaleProps = { readonly params: Promise<{ locale: string }> }
export type ListingProps = LocaleProps & { readonly searchParams: SearchParams }
export type SlugProps = { readonly params: Promise<{ locale: string; slug: string }> }
export type SlugListingProps = SlugProps & { readonly searchParams: SearchParams }
export type TokenProps = { readonly params: Promise<{ locale: string; token: string }> }
