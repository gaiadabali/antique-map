/** Types for `./draft-button.jsx` — structural, see `../../admin/leads/inbox.d.ts`'s header. */
export type DraftFromPhotosButtonProps = {
  readonly id?: number | string
  readonly req?: { readonly user?: unknown }
  readonly user?: unknown
  readonly i18n?: { readonly language?: string }
}

export function DraftFromPhotosButton(props: DraftFromPhotosButtonProps): unknown
