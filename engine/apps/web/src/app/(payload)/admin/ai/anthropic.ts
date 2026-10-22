/**
 * The drafting tool's vision call through the official SDK (TASKS.md 8.3.a; AI.md §1, §5): the
 * `@engine/cms/ai` `DraftModel` port. The key is `ANTHROPIC_API_KEY`, host-only, handed to the
 * client and nowhere else — never logged, never in an answer. One non-streaming call with the
 * structured-output schema; the photographs go as base64 image blocks before the one line of
 * text, and the system prompt is fixed (`@engine/cms/ai` `prompt`).
 */
import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import type { DraftModel, DraftModelReply, DraftModelRequest } from '@engine/cms/ai'

/** The slice of the SDK the adapter uses: `messages.create`, so a test can stand in for it. */
export type MessagesApi = {
  create(
    params: Anthropic.MessageCreateParamsNonStreaming,
    options?: { signal?: AbortSignal },
  ): Promise<Anthropic.Message>
}

export function draftParams(request: DraftModelRequest): Anthropic.MessageCreateParamsNonStreaming {
  const images: Anthropic.ImageBlockParam[] = request.images.map((image) => ({
    type: 'image',
    source: { type: 'base64', media_type: image.mediaType, data: image.data },
  }))
  return {
    model: request.model,
    max_tokens: request.maxTokens,
    system: request.system,
    output_config: { format: { type: 'json_schema', schema: request.schema } },
    messages: [{ role: 'user', content: [...images, { type: 'text', text: request.text }] }],
  }
}

export function replyOf(message: Anthropic.Message): DraftModelReply {
  const usage = {
    inputTokens: message.usage?.input_tokens ?? 0,
    outputTokens: message.usage?.output_tokens ?? 0,
  }
  if (message.stop_reason === 'refusal') return { kind: 'refusal', usage }
  const text = message.content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('')
  // A reply cut off at the token limit is not the schema: the parser refuses it.
  return { kind: 'text', text, usage }
}

export function anthropicDraftModel(messages: MessagesApi): DraftModel {
  return {
    async draft(request, signal) {
      return replyOf(await messages.create(draftParams(request), { signal }))
    },
  }
}

export function anthropicMessages(apiKey: string): MessagesApi {
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 90_000 })
  return client.messages
}
