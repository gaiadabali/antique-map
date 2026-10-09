/** Types for `./reply-block.jsx` — structural, see `./inbox.d.ts`'s header. */
export type LeadReplyBlockProps = {
  readonly data?: Record<string, unknown> | null
  readonly id?: number | string
  readonly payload: unknown
  readonly req: unknown
  readonly i18n?: { readonly language?: string }
}

export function LeadReplyBlock(props: LeadReplyBlockProps): Promise<unknown>
