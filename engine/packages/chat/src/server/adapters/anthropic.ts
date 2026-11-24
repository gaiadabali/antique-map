/**
 * The Claude API through the official SDK (AI.md §1). The key is `ANTHROPIC_API_KEY`, host-only,
 * passed to the client and nowhere else — never logged, never in an error the chat surfaces. The
 * browser never talks to Anthropic. Retries are the SDK's (429, 5xx, connection errors), twice;
 * a call that still fails ends the turn with the canned line and the handoff.
 */
import 'server-only'

import Anthropic from '@anthropic-ai/sdk'

import type { AnswerStream, ChatModelClient } from '../ports'

/** `baseURL` is for tests against a local stand-in of the API; production uses the default. */
export function anthropicClient(apiKey: string, baseURL?: string): ChatModelClient {
  const client = new Anthropic({
    apiKey,
    maxRetries: 2,
    timeout: 60_000,
    ...(baseURL ? { baseURL } : {}),
  })
  return {
    streamAnswer(params, signal): AnswerStream {
      const stream = client.messages.stream(params, { signal })
      // A stream the chat stops on purpose (a blocked sentence, the visitor's Stop) aborts with
      // nothing awaiting `finalMessage()`; when no listener is attached at that moment (an abort
      // before iteration starts, say) the SDK raises it as an unhandled rejection, which would
      // take the process down. Errors still reach the caller
      // through the event iterator and `finalMessage()`.
      stream.on('abort', () => {})
      stream.on('error', () => {})
      return { events: stream, finalMessage: () => stream.finalMessage() }
    },
    classify(params, signal) {
      return client.messages.create(params, { signal, timeout: 15_000 })
    },
  }
}
