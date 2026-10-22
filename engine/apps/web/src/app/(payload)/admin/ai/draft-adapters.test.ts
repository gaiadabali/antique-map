/**
 * The drafting route's adapters (TASKS.md 8.3.a): the Anthropic call carries the photographs as
 * image blocks, the fixed system prompt and the structured-output schema; a refusal and a reply's
 * text come back as the port says; the photographs are the public derivatives at most 1,600 px on
 * their long edge, built from the record and `MEDIA_PUBLIC_URL` alone; the model id is config.
 */
import type Anthropic from '@anthropic-ai/sdk'
import { DRAFT_REPLY_SCHEMA, DRAFT_SYSTEM_PROMPT, type DraftModelRequest } from '@engine/cms/ai'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { anthropicDraftModel, draftParams, replyOf, type MessagesApi } from './anthropic'
import { draftModelId } from './deps'
import { derivativeImageSource, draftImageUrl, draftRung } from './images'

const request: DraftModelRequest = {
  model: 'claude-test',
  system: DRAFT_SYSTEM_PROMPT,
  text: 'Here are 2 photographs of the object.',
  images: [
    { mediaId: 1, mediaType: 'image/webp', data: 'AAAA' },
    { mediaId: 2, mediaType: 'image/webp', data: 'BBBB' },
  ],
  schema: DRAFT_REPLY_SCHEMA,
  maxTokens: 4096,
}

const message = (over: Partial<Anthropic.Message>): Anthropic.Message =>
  ({
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-test',
    content: [{ type: 'text', text: '{"title":{}}', citations: null }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 2000, output_tokens: 300 },
    ...over,
  }) as unknown as Anthropic.Message

describe('the drafting model adapter (8.3.a)', () => {
  it('sends the photographs before the text, with the fixed prompt and the schema', () => {
    const params = draftParams(request)
    expect(params).toMatchObject({
      model: 'claude-test',
      max_tokens: 4096,
      system: DRAFT_SYSTEM_PROMPT,
      output_config: { format: { type: 'json_schema', schema: DRAFT_REPLY_SCHEMA } },
    })
    const content = params.messages[0]!.content as Anthropic.ContentBlockParam[]
    expect(content.map((block) => block.type)).toEqual(['image', 'image', 'text'])
    expect(content[0]).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/webp', data: 'AAAA' },
    })
    expect(params).not.toHaveProperty('tools')
  })

  it('answers the reply’s text, or a refusal, with the usage', async () => {
    expect(replyOf(message({}))).toEqual({
      kind: 'text',
      text: '{"title":{}}',
      usage: { inputTokens: 2000, outputTokens: 300 },
    })
    expect(replyOf(message({ stop_reason: 'refusal', content: [] }))).toMatchObject({
      kind: 'refusal',
    })
    const calls: unknown[] = []
    const api: MessagesApi = {
      async create(params) {
        calls.push(params)
        return message({})
      },
    }
    expect(await anthropicDraftModel(api).draft(request)).toMatchObject({ kind: 'text' })
    expect(calls).toHaveLength(1)
  })

  it('takes the model id from AI_DRAFT_MODEL, else the chat model', () => {
    expect(draftModelId({ AI_DRAFT_MODEL: 'claude-opus-5-5' })).toBe('claude-opus-5-5')
    expect(draftModelId({ AI_DRAFT_MODEL: 'not a model id!', AI_CHAT_MODEL: 'claude-x-1' })).toBe(
      'claude-x-1',
    )
    expect(draftModelId({})).toMatch(/^claude-/)
  })
})

describe('the drafting photographs (8.3.a; AI.md §5)', () => {
  const assetId = '0123456789abcdef0123456789abcdef'
  const media = { id: 5, assetId, width: 3000, height: 2000, derivativesReady: true }

  it('picks the widest rung whose long edge is at most 1,600 px', () => {
    expect(draftRung(3000, 2000)).toBe(1600)
    // A tall image: 1,024 px wide is 1,536 px tall; 1,600 wide would be 2,400 tall.
    expect(draftRung(2000, 3000)).toBe(1024)
    expect(draftRung(900, 600)).toBe(900)
  })

  it('builds the URL from the record and the configured base only', () => {
    expect(draftImageUrl(media, 'https://media.example/')).toBe(
      `https://media.example/derivatives/v1/${assetId}/1600.webp`,
    )
    expect(draftImageUrl({ ...media, derivativesReady: false }, 'https://media.example')).toBeNull()
    expect(
      draftImageUrl({ ...media, assetId: '../../etc/passwd' }, 'https://media.example'),
    ).toBeNull()
    expect(draftImageUrl(media, '')).toBeNull()
  })

  it('loads a WebP as base64, and nothing else', async () => {
    const seen: string[] = []
    const fetcher = (async (url: string) => {
      seen.push(url)
      return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/webp' } })
    }) as unknown as typeof fetch
    const image = await derivativeImageSource('https://media.example', fetcher).load(media)
    expect(image).toEqual({ mediaId: 5, mediaType: 'image/webp', data: 'AQID' })
    expect(seen).toEqual([`https://media.example/derivatives/v1/${assetId}/1600.webp`])
    const html = (async () =>
      new Response('<html>', {
        headers: { 'content-type': 'text/html' },
      })) as unknown as typeof fetch
    expect(await derivativeImageSource('https://media.example', html).load(media)).toBeNull()
    const missing = (async () => new Response('', { status: 404 })) as unknown as typeof fetch
    expect(await derivativeImageSource('https://media.example', missing).load(media)).toBeNull()
  })

  it('reads no body declared over 8 MiB, and answers no image when the body fails mid-read', async () => {
    let pulled = 0
    const huge = (async () =>
      new Response(
        new ReadableStream({
          pull(controller) {
            pulled += 1
            controller.enqueue(new Uint8Array(1024))
          },
        }),
        { headers: { 'content-type': 'image/webp', 'content-length': String(64 * 1024 * 1024) } },
      )) as unknown as typeof fetch
    expect(await derivativeImageSource('https://media.example', huge).load(media)).toBeNull()
    expect(pulled).toBeLessThan(4)
    const broken = (async () =>
      new Response(
        new ReadableStream({
          pull(controller) {
            controller.error(new Error('reset'))
          },
        }),
        { headers: { 'content-type': 'image/webp' } },
      )) as unknown as typeof fetch
    expect(await derivativeImageSource('https://media.example', broken).load(media)).toBeNull()
  })
})
