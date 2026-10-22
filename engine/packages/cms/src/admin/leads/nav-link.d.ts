/** Types for `./nav-link.jsx` — structural (`./inbox.d.ts`); Payload hands nav links `{ user, i18n }`, not `req`. */
export type LeadsNavLinkProps = {
  readonly user?: unknown
  readonly i18n?: { readonly language?: string }
}

export function LeadsNavLink(props: LeadsNavLinkProps): Promise<unknown>
