/** Types for `./list-cells.jsx` — structural, see `../leads/inbox.d.ts`'s header. */
export type ProductCellProps = {
  readonly cellData?: unknown
  readonly rowData?: { readonly id?: number | string }
  readonly payload?: unknown
  readonly i18n?: { readonly language?: string }
}

export function ProductPhotoCell(props: ProductCellProps): Promise<unknown>
export function ProductStockCell(props: ProductCellProps): Promise<unknown>
