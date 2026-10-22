/** Types for `./source-block.jsx` — structural, see `./inbox.d.ts`'s header. */
export type LeadSourceBlockProps = {
  readonly data?: Record<string, unknown> | null
  readonly payload: unknown
  readonly req: unknown
  readonly i18n?: { readonly language?: string }
}

export function LeadSourceBlock(props: LeadSourceBlockProps): Promise<unknown>
