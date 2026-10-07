/**
 * A `ChatModelClient` that plays back one case's `Recording` (ticket 8.4b): the runner calls
 * `nextTurn()` before each visitor turn, then `runTurn` drives the real pipeline exactly as it
 * would against the live API, reading each round's classify label and answer reply from the
 * recording in order. Built on the same message framing as the mocked-run double
 * (`../test-support/fake-model`), so an aborted stream and chunked text behave the same way.
 */
import 'server-only'

import type Anthropic from '@anthropic-ai/sdk'

import { eventsOf, message } from '../test-support/fake-model'
import type { AnswerStream, ChatModelClient } from '../ports'
import type { Recording } from './recording'

export class RecordedModel implements ChatModelClient {
  private turnIndex = -1
  private roundIndex = 0

  constructor(private readonly recording: Recording) {}

  /** Advances to the next visitor turn; call once before each `runTurn`. */
  nextTurn(): void {
    this.turnIndex += 1
    this.roundIndex = 0
  }

  streamAnswer(params: Anthropic.MessageStreamParams, signal: AbortSignal): AnswerStream {
    const turn = this.recording.turns[this.turnIndex]
    if (turn === undefined) {
      throw new Error(`no recorded turn ${this.turnIndex + 1} for case ${this.recording.caseId}`)
    }
    const reply = turn.calls[this.roundIndex]
    if (reply === undefined) {
      throw new Error(
        `no recorded round ${this.roundIndex} in turn ${this.turnIndex + 1} of case ${this.recording.caseId}`,
      )
    }
    const call = this.roundIndex
    this.roundIndex += 1
    const msg = message(reply, params.model, this.turnIndex * 10 + call)
    const onAbort = () => {}
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
    const turn = this.recording.turns[this.turnIndex]
    const label = turn?.classifierLabel ?? 'browse'
    return message({ text: JSON.stringify({ label }) }, params.model, -1)
  }
}
