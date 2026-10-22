/**
 * Live mode (`--live`, AI.md Â§6 "real-model run"): the real Anthropic adapter, wrapped to capture
 * each call as a `Recording` turn so `--record` can write it back. Paced one session at a time (the
 * runner already awaits each case before starting the next) and stopped by the caller once the
 * running cost passes `--max-usd`.
 */
import 'server-only'

import type Anthropic from '@anthropic-ai/sdk'

import { anthropicClient } from '../adapters/anthropic'
import { parseLabel } from '../classify'
import { chatModels, type ChatModels } from '../env'
import type { AnswerStream, ChatModelClient } from '../ports'
import type { ClassifierLabel } from '../types'
import type { Recording, RecordedTurn } from './recording'
import type { ScriptedReply } from '../test-support/fake-model'

const MODEL_ID = /^[a-z0-9][a-z0-9.\-_:@/]{2,80}$/i

/**
 * Live mode's model ids. `AI_EVAL_MODEL` (an OpenRouter id such as `z-ai/glm-5.3-flash` is fine)
 * answers and, unless `AI_EVAL_CLASSIFY_MODEL` says otherwise, classifies too; with neither set the
 * chat's own `AI_CHAT_MODEL` / `AI_CLASSIFY_MODEL` apply.
 */
export function evalModels(env: Readonly<Record<string, string | undefined>>): ChatModels {
  const base = chatModels(env)
  const pick = (name: string): string | null => {
    const v = env[name]?.trim()
    return v && MODEL_ID.test(v) ? v : null
  }
  const chat = pick('AI_EVAL_MODEL')
  if (chat === null) return base
  return { ...base, chat, classify: pick('AI_EVAL_CLASSIFY_MODEL') ?? chat }
}

/**
 * `null` when `ANTHROPIC_API_KEY` is unset — live mode must refuse, not run. An optional
 * `ANTHROPIC_BASE_URL` points the adapter at an Anthropic-compatible gateway (OpenRouter:
 * `https://openrouter.ai/api`).
 */
export function liveModel(
  env: Readonly<Record<string, string | undefined>>,
): ChatModelClient | null {
  const key = env.ANTHROPIC_API_KEY?.trim()
  if (!key) return null
  const baseURL = env.ANTHROPIC_BASE_URL?.trim()
  return anthropicClient(key, baseURL || undefined)
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
