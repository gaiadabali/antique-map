/**
 * Types for the orders panel view (`./view.jsx`, which the cms package does not type-check — see
 * `./shared.jsx`'s header). Structural, not Payload's own `AdminViewServerProps`: that type lives
 * on a subpath this package's `tsconfig` does not need for anything else, and a shim need only
 * describe what this view actually reads.
 */
export type OrdersPanelViewProps = {
  readonly payload: unknown
  readonly i18n?: { readonly language?: string }
  readonly params?: { readonly segments?: readonly string[] }
  readonly searchParams?: Record<string, string | string[] | undefined>
  readonly initPageResult?: { readonly req?: unknown }
}

export function OrdersPanelView(props: OrdersPanelViewProps): Promise<unknown>
