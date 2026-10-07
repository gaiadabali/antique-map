/**
 * Live mode (`--live`, AI.md §6 "real-model run"): the real Anthropic adapter, wrapped to capture
 * each call as a `Recording` turn so `--record` can write it back. Paced one session at a time (the
 * runner already awaits each case before starting the next) and stopped by the caller once the
 * running cost passes `--max-usd`.
 */
import 'server-only'

import type Anthropic from '@anthropic-ai/sdk'

import { anthropicClient } from '../adapters/anthropic'
import { parseLabel } from '../classify'
import type { AnswerStream, ChatModelClient } from '../ports'
import type { ClassifierLabel } from '../types'
import type { Recording, RecordedTurn } from './recording'
import type { ScriptedReply } from '../test-support/fake-model'

/** `null` with a clear reason when `ANTHROPIC_API_KEY` is unset — live mode must refuse, not run. */
export function liveModel(
  env: Readonly<Record<string, string | undefined>>,
): ChatModelClient | null {
  const key = env.ANTHROPIC_API_KEY?.trim()
  if (!key) return null
  return anthropicClient(key)
}

function replyOf(msg: Anthropic.Message): ScriptedReply {
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  const tools = msg.content
    .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    .map((b) => ({ name: b.name, input: b.input }))
  if (msg.stop_reason === 'refusal') return { refusal: true, ...(text ? { text } : {}) }
  if (tools.length > 0) return { ...(text ? { text } : {}), tools }
  return { text }
}

/** Wraps a real `ChatModelClient`, recording every call as it happens. */
export class CapturingModel implements ChatModelClient {
  private readonly turns: RecordedTurn[] = []
  private calls: ScriptedReply[] = []
  private label: ClassifierLabel | null = null

  constructor(
    private readonly inner: ChatModelClient,
    private readonly caseId: string,
  ) {}

  nextTurn(): void {
    if (this.calls.length > 0 || this.label !== null) {
      this.turns.push({ classifierLabel: this.label, calls: this.calls })
    }
    this.calls = []
    this.label = null
  }

  recording(): Recording {
    this.nextTurn()
    const recorded = [...this.turns]
    this.turns.length = 0
    return { caseId: this.caseId, turns: recorded }
  }

  streamAnswer(params: Anthropic.MessageStreamParams, signal: AbortSignal): AnswerStream {
    const stream = this.inner.streamAnswer(params, signal)
    const finalMessage = async () => {
      const msg = await stream.finalMessage()
      this.calls.push(replyOf(msg))
      return msg
    }
    return { events: stream.events, finalMessage }
  }

  async classify(
    params: Anthropic.MessageCreateParamsNonStreaming,
    signal: AbortSignal,
  ): Promise<Anthropic.Message> {
    const msg = await this.inner.classify(params, signal)
    this.label = parseLabel(msg)
    return msg
  }
}
