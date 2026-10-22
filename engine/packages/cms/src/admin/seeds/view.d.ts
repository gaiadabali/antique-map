/** Types for `./view.jsx` — structural, see `../leads/inbox.d.ts`'s header. */
export type SeedsViewProps = {
  readonly i18n?: { readonly language?: string }
  readonly initPageResult?: { readonly req?: unknown }
}

export function SeedsView(props: SeedsViewProps): Promise<unknown>
