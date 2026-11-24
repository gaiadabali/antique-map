/** Types for `./view.jsx` — structural, see `../leads/inbox.d.ts`'s header. */
export type StockMatrixViewProps = {
  readonly i18n?: { readonly language?: string }
  readonly initPageResult?: { readonly req?: unknown }
  readonly searchParams?: Record<string, string | string[] | undefined>
}

export function StockMatrixView(props: StockMatrixViewProps): Promise<unknown>
