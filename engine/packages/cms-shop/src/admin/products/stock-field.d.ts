/** Types for `./stock-field.jsx` — structural, see `../leads/inbox.d.ts`'s header. */
export type ProductStockFieldProps = {
  readonly id?: number | string
  readonly req?: unknown
  readonly user?: unknown
  readonly data?: unknown
  readonly i18n?: { readonly language?: string }
}

export function ProductStockField(props: ProductStockFieldProps): Promise<unknown>
