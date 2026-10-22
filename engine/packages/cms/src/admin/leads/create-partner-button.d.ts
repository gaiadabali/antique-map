/** Types for `./create-partner-button.jsx` — structural, see `./inbox.d.ts`'s header. */
export type CreatePartnerButtonProps = {
  readonly data?: Record<string, unknown> | null
  readonly id?: number | string
  readonly i18n?: { readonly language?: string }
}

export function CreatePartnerButton(props: CreatePartnerButtonProps): unknown
