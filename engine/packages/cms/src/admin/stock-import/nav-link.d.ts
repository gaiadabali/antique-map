/** Types for `./nav-link.jsx` — structural; Payload hands nav links `{ user, i18n }`, not `req`. */
export type StockImportNavLinkProps = {
  readonly user?: unknown
  readonly i18n?: { readonly language?: string }
}

export function StockImportNavLink(props: StockImportNavLinkProps): Promise<unknown>
