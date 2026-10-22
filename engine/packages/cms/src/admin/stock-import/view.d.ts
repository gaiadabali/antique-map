/** Types for `./view.jsx` — structural, see `../leads/inbox.d.ts`'s header. */
export type StockImportViewProps = {
  readonly i18n?: { readonly language?: string }
  readonly initPageResult?: { readonly req?: unknown }
}

export function StockImportView(props: StockImportViewProps): Promise<unknown>
