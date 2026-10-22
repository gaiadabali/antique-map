/** Types for `./partner-leads.jsx` — structural, see `./inbox.d.ts`'s header. */
export type PartnerLeadsListProps = {
  readonly id?: number | string
  readonly payload: unknown
  readonly req: unknown
  readonly i18n?: { readonly language?: string }
}

export function PartnerLeadsList(props: PartnerLeadsListProps): Promise<unknown>
