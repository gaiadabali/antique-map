/** Types for `./nav-link.jsx` — structural, see `./inbox.d.ts`'s header. */
export type LeadsNavLinkProps = {
  readonly req?: { readonly user?: unknown; readonly i18n?: { readonly language?: string } }
}

export function LeadsNavLink(props: LeadsNavLinkProps): Promise<unknown>
