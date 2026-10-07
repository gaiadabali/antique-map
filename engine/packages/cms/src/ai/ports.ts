/**
 * What the drafting tool needs from outside the CMS (TASKS.md 8.3.a), as ports the app wires:
 *
 * - `DraftModel` — one vision call. The app's adapter is Anthropic's
 *   (`apps/web/src/app/api/x/draft/anthropic.ts`; the key is host-only, read there); tests use a
 *   scripted fake (`./test-support`).
 * - `DraftImageSource` — a work image's bytes, fetched on the server: the public derivative at
 *   most 1,600 px on its long edge, re-encoded with no metadata (AI.md §5).
 */
export type DraftImage = {
  readonly mediaId: number | string
  readonly mediaType: 'image/webp' | 'image/jpeg' | 'image/png'
  /** The bytes, base64. */
  readonly data: string
}

export type DraftUsage = { readonly inputTokens: number; readonly outputTokens: number }

export type DraftModelRequest = {
  readonly model: string
  readonly system: string
  readonly text: string
  readonly images: readonly DraftImage[]
  /** The structured-output JSON schema (`./reply` `DRAFT_REPLY_SCHEMA`). */
  readonly schema: Record<string, unknown>
  readonly maxTokens: number
}

export type DraftModelReply =
  | { readonly kind: 'text'; readonly text: string; readonly usage: DraftUsage }
  | { readonly kind: 'refusal'; readonly usage: DraftUsage }

export interface DraftModel {
  draft(request: DraftModelRequest, signal?: AbortSignal): Promise<DraftModelReply>
}

/** What the image source is told about one image: the media record's own fields. */
export type DraftMediaFacts = {
  readonly id: number | string
  readonly assetId: string | null
  readonly width: number | null
  readonly height: number | null
  readonly derivativesReady: boolean
}

export interface DraftImageSource {
  /** The image's bytes, or `null` when it has none to send yet (no derivative made). */
  load(media: DraftMediaFacts, signal?: AbortSignal): Promise<DraftImage | null>
}
