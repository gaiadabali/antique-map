/**
 * The apply form's choices and the shape of their words — no lexicon here, so the client island
 * can import it without carrying the shop's copy into the browser (`./segments` resolves the words
 * on the server).
 */
export const SEGMENTS = ['reseller', 'company', 'hotel'] as const
export type Segment = (typeof SEGMENTS)[number]

export const isSegment = (value: unknown): value is Segment =>
  typeof value === 'string' && (SEGMENTS as readonly string[]).includes(value)

/** One segment's words, resolved on the server for the island. */
export type SegmentWords = {
  readonly label: string
  readonly org: string
  readonly scale: string
  readonly context: string
  readonly submit: string
  readonly reply: string
}

export type SegmentText = {
  readonly question: string
  readonly more: string
  readonly promise: string
  readonly segments: Readonly<Record<Segment, SegmentWords>>
}
