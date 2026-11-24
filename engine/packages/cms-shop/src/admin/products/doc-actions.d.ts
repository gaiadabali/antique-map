/** Types for `./doc-actions.jsx` — structural, see `../leads/inbox.d.ts`'s header. */
export type ProductDocActionsProps = {
  readonly id?: number | string
  readonly payload?: unknown
  readonly user?: unknown
  readonly i18n?: { readonly language?: string }
  readonly locale?: unknown
}

export function ProductDocActions(props: ProductDocActionsProps): Promise<unknown>
