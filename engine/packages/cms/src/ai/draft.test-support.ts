/**
 * Test support only — imported by tests, never by runtime code.
 *
 * A scripted drafting model and image source (TASKS.md 8.3): the model records every request and
 * answers from a script, which may "read" the photographs — the fake image's bytes are the text
 * written on the object — so a test can stand in for a model that obeys an instruction in a
 * photograph and prove the server writes nothing it should not.
 */
import type { DraftImageSource, DraftModel, DraftModelReply, DraftModelRequest } from './ports'

export type DraftScript = (
  request: DraftModelRequest,
  writing: readonly string[],
) => DraftModelReply

export const FAKE_USAGE = { inputTokens: 2400, outputTokens: 310 } as const

export class ScriptedDraftModel implements DraftModel {
  readonly requests: DraftModelRequest[] = []

  constructor(public script: DraftScript) {}

  async draft(request: DraftModelRequest): Promise<DraftModelReply> {
    this.requests.push(structuredClone(request))
    const writing = request.images.map((image) => Buffer.from(image.data, 'base64').toString())
    return this.script(request, writing)
  }
}

export const text = (value: unknown): DraftModelReply => ({
  kind: 'text',
  text: typeof value === 'string' ? value : JSON.stringify(value),
  usage: FAKE_USAGE,
})

/** Every photograph "shows" `writing` (its bytes are that text); `null` loads none. */
export function fakeImages(writing: (mediaId: number | string) => string | null): DraftImageSource {
  return {
    async load(media) {
      const words = writing(media.id)
      if (words === null) return null
      return {
        mediaId: media.id,
        mediaType: 'image/webp',
        data: Buffer.from(words).toString('base64'),
      }
    },
  }
}

const evidence = { confidence: 'medium', basis: 'engraving style' } as const

/** A schema-exact reply drafting every field; `over` replaces whole entries. */
export function goodReply(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: { value: 'Insula Bali, after Valentijn', ...evidence, basis: 'title in the cartouche' },
    description: {
      en: 'An engraved map of Bali with its villages and rivers.',
      id: 'Peta Bali hasil grafir dengan desa dan sungainya.',
      ...evidence,
    },
    objectType: { value: 'map', ...evidence },
    date: { precision: 'circa', from: 1726, to: null, ...evidence },
    places: { names: ['bali', 'Atlantis'], ...evidence },
    subjects: { names: ['VOC'], ...evidence },
    dimensions: {
      scaleVisible: true,
      image: { height: 280, width: 360 },
      sheet: { height: 310, width: 400 },
      ...evidence,
      basis: 'ruler in the frame',
    },
    ...over,
  }
}
