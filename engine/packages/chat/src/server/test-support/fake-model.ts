/**
 * A scripted Claude for the mocked run (AI.md §6): it records every request byte for byte and
 * answers each call from a script — text, tool calls, a refusal — as the real stream's events, so
 * the real pipeline (gates, tools, framing, output checks, recording) runs with no key.
 */
import type Anthropic from '@anthropic-ai/sdk'

import type { AnswerStream, ChatModelClient } from '../ports'

export type ScriptedReply =
  | { readonly text: string }
  | {
      readonly text?: string
      readonly tools: readonly { readonly name: string; readonly input: unknown }[]
    }
  | { readonly refusal: true; readonly text?: string }

export type Script = (params: Anthropic.MessageStreamParams, call: number) => ScriptedReply

export const USAGE = { input: 1200, output: 80, cacheRead: 3000 } as const

export function message(reply: ScriptedReply, model: string, call: number): Anthropic.Message {
  const content: Anthropic.ContentBlock[] = []
  if ('text' in reply && reply.text) {
    content.push({ type: 'text', text: reply.text, citations: null } as Anthropic.TextBlock)
  }
  if ('tools' in reply) {
    reply.tools.forEach((tool, index) =>
      content.push({
        type: 'tool_use',
        id: `toolu_${call}_${index}`,
        name: tool.name,
        input: tool.input,
        caller: { type: 'direct' },
      } as Anthropic.ToolUseBlock),
    )
  }
  const stop = 'refusal' in reply ? 'refusal' : 'tools' in reply ? 'tool_use' : 'end_turn'
  return {
    id: `msg_${call}`,
    type: 'message',
    role: 'assistant',
    model,
    content,
    stop_reason: stop,
    stop_sequence: null,
    stop_details:
      stop === 'refusal' ? { type: 'refusal', category: null, explanation: null } : null,
    usage: {
      input_tokens: USAGE.input,
      output_tokens: USAGE.output,
      cache_read_input_tokens: USAGE.cacheRead,
      cache_creation_input_tokens: 0,
    },
  } as unknown as Anthropic.Message
}

export function* eventsOf(msg: Anthropic.Message): Generator<Anthropic.MessageStreamEvent> {
  yield {
    type: 'message_start',
    message: { ...msg, content: [], stop_reason: null, usage: { ...msg.usage, output_tokens: 1 } },
  } as unknown as Anthropic.MessageStreamEvent
  for (const [index, block] of msg.content.entries()) {
    if (block.type === 'text') {
      yield {
        type: 'content_block_start',
        index,
        content_block: { type: 'text', text: '' },
      } as unknown as Anthropic.MessageStreamEvent
      // Small chunks, as the API streams them: a sentence check must work across chunks.
      for (let at = 0; at < block.text.length; at += 7) {
        yield {
          type: 'content_block_delta',
          index,
          delta: { type: 'text_delta', text: block.text.slice(at, at + 7) },
        } as Anthropic.MessageStreamEvent
      }
    } else if (block.type === 'tool_use') {
      yield {
        type: 'content_block_start',
        index,
        content_block: { ...block, input: {} },
      } as unknown as Anthropic.MessageStreamEvent
      yield {
        type: 'content_block_delta',
        index,
        delta: { type: 'input_json_delta', partial_json: JSON.stringify(block.input) },
      } as Anthropic.MessageStreamEvent
    }
    yield { type: 'content_block_stop', index } as Anthropic.MessageStreamEvent
  }
  yield {
    type: 'message_delta',
    delta: { stop_reason: msg.stop_reason, stop_sequence: null, stop_details: msg.stop_details },
    usage: { output_tokens: msg.usage.output_tokens },
  } as unknown as Anthropic.MessageStreamEvent
  yield { type: 'message_stop' } as Anthropic.MessageStreamEvent
}

export class FakeModel implements ChatModelClient {
  readonly answerCalls: Anthropic.MessageStreamParams[] = []
  readonly classifyCalls: Anthropic.MessageCreateParamsNonStreaming[] = []
  /** Calls whose stream was aborted before it finished (a blocked sentence, the Stop button). */
  aborted = 0

  constructor(
    private readonly script: Script,
    private readonly label: (text: string) => string = () => 'browse',
  ) {}

  streamAnswer(params: Anthropic.MessageStreamParams, signal: AbortSignal): AnswerStream {
    const call = this.answerCalls.length
    // A deep copy: what was sent, not what the loop appends afterwards.
    this.answerCalls.push(structuredClone(params))
    const msg = message(this.script(params, call), params.model, call)
    const onAbort = () => {
      this.aborted += 1
    }
    signal.addEventListener('abort', onAbort, { once: true })
    return {
      events: {
        async *[Symbol.asyncIterator]() {
          for (const event of eventsOf(msg)) {
            if (signal.aborted) throw new Error('aborted')
            yield event
          }
        },
      },
      finalMessage: async () => msg,
    }
  }

  async classify(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message> {
    this.classifyCalls.push(structuredClone(params))
    const first = params.messages[0]
    const text = typeof first?.content === 'string' ? first.content : ''
    return message({ text: JSON.stringify({ label: this.label(text) }) }, params.model, -1)
  }
}

/** Everything the model was sent across all calls, as one string: for "never reached the model" checks. */
export function everythingSent(model: FakeModel): string {
  return JSON.stringify([model.answerCalls, model.classifyCalls])
}

/** The text of the last user message in a request (a string, or its tool results joined). */
export function toolResultsOf(params: Anthropic.MessageStreamParams): string[] {
  const last = params.messages.at(-1)
  if (!last || typeof last.content === 'string') return []
  return last.content.flatMap((block) =>
    block.type === 'tool_result' && typeof block.content === 'string' ? [block.content] : [],
  )
}
