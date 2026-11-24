/** Types for `./list-bar.jsx` — structural, see `../leads/inbox.d.ts`'s header. */
export type ProductListBarProps = {
  readonly payload?: unknown
  readonly user?: unknown
  readonly i18n?: { readonly language?: string }
  readonly searchParams?: Record<string, unknown>
  readonly locale?: unknown
}

export function ProductListBar(props: ProductListBarProps): Promise<unknown>
