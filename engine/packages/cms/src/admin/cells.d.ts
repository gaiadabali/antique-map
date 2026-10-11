/** Types for `./cells.jsx` — structural, as `./language-link.d.ts`. */
export type RupiahCellProps = {
  readonly cellData?: unknown
  readonly i18n?: { readonly language?: string }
}

export function RupiahCell(props: RupiahCellProps): unknown
