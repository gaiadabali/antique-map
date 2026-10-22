/** Types for `./nav-link.jsx` — structural; Payload hands nav links `{ user, i18n }`, not `req`. */
export type SeedsNavLinkProps = {
  readonly user?: unknown
  readonly i18n?: { readonly language?: string }
}

export function SeedsNavLink(props: SeedsNavLinkProps): Promise<unknown>
