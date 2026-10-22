/**
 * Types for the leads inbox view (`./inbox.jsx`, which the cms package does not type-check — see
 * `./shared.jsx`'s header). Structural, as `../orders/view.d.ts`.
 */
export type LeadsInboxViewProps = {
  readonly payload: unknown
  readonly i18n?: { readonly language?: string }
  readonly searchParams?: Record<string, string | string[] | undefined>
  readonly initPageResult?: { readonly req?: unknown }
}

export function LeadsInboxView(props: LeadsInboxViewProps): Promise<unknown>
