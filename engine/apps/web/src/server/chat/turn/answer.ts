/**
 * The answer loop (AI.md §2.1 steps 4–6): `AI_CHAT_MODEL`, streaming, tools with `strict: true`
 * and `tool_choice: auto`, at most four tool rounds. The request order is stable for the prompt
 * cache — tools, the frozen system prompt (one cache breakpoint), then the conversation — and the
 * turn's operator note is a mid-conversation `system` message after the visitor's message.
 *
 * Text is released sentence by sentence through the output checks; a blocked sentence stops the
 * upstream stream (it stops spending) and ends the turn with the canned line and a handoff. A
 * `refusal` stop is answered the same way: the API's server-side fallback to another model is not
 * used, because a handoff is the right answer to a refused visitor question. Every call's usage
 * is counted from the stream's own events, so an aborted call is still paid for in the ledger.
 */
import 'server-only'

import type Anthropic from '@anthropic-ai/sdk'

import { addUsage, costUsd, emptyUsage } from '../cost'
import { CHAT_LIMITS, type ChatModels } from '../env'
import type { ChatModelClient } from '../ports'
import { OutputFilter, type BlockRule, type CheckContext } from '../text/output-check'
import { toolsFor } from '../tools/schemas'
import { runTool, type ToolContext } from '../tools/run'
import { validateToolCall } from '../tools/validate'
import type { ChatEvent, TokenUsage } from '../types'

export type AnswerInput = {
  readonly client: ChatModelClient
  readonly models: ChatModels
  readonly system: string
  readonly messages: readonly Anthropic.MessageParam[]
  readonly check: CheckContext
  readonly tools: ToolContext
  readonly signal: AbortSignal
  readonly emit: (event: ChatEvent) => void
  /** Called before each model call with this turn's usage and spend so far; a cap stops the loop. */
  readonly mayCall: (
    turnUsage: TokenUsage,
    turnCostUsd: number,
  ) => Promise<'budget_exhausted' | 'session_limit' | null>
}

export type AnswerResult = {
  readonly text: string
  readonly ended: 'answered' | 'refused' | 'blocked' | 'capped' | 'failed'
  readonly blockedBy: BlockRule | null
  /** Which cap stopped the loop, when one did. */
  readonly cappedBy: 'budget_exhausted' | 'session_limit' | null
  readonly usage: TokenUsage
  readonly costUsd: number
  readonly labels: readonly string[]
  /** Whether any tool already showed handoff buttons. */
  readonly handoffShown: boolean
}

/** `between_tools` is Claude Sonnet 5.5's lowest thinking setting; other models keep their default. */
function thinkingFor(model: string): Pick<Anthropic.MessageStreamParams, 'thinking'> {
  return model.startsWith('claude-sonnet-5-5') ? { thinking: { type: 'between_tools' } } : {}
}

export function answerParams(
  input: Pick<AnswerInput, 'models' | 'system' | 'tools'>,
  messages: readonly Anthropic.MessageParam[],
  lastRound: boolean,
): Anthropic.MessageStreamParams {
  const model = input.models.chat
  return {
    model,
    max_tokens: CHAT_LIMITS.answerMaxTokens,
    tools: [...toolsFor(input.tools.site)],
    tool_choice: lastRound ? { type: 'none' } : { type: 'auto' },
    system: [{ type: 'text', text: input.system, cache_control: { type: 'ephemeral' } }],
    messages: [...messages],
    cache_control: { type: 'ephemeral' },
    output_config: { effort: input.models.effort },
    ...thinkingFor(model),
  }
}

export async function answer(input: AnswerInput): Promise<AnswerResult> {
  const filter = new OutputFilter(input.check)
  const usage = emptyUsage()
  const labels: string[] = []
  const messages: Anthropic.MessageParam[] = [...input.messages]
  let handoffShown = false
  let cost = 0
  let cappedBy: AnswerResult['cappedBy'] = null
  const result = (ended: AnswerResult['ended']): AnswerResult => ({
    text: filter.released,
    ended: filter.blocked ? 'blocked' : ended,
    blockedBy: filter.blocked,
    cappedBy,
    usage,
    costUsd: cost,
    labels,
    handoffShown,
  })

  for (let round = 0; round <= CHAT_LIMITS.toolRoundsPerTurn; round++) {
    cappedBy = await input.mayCall(usage, cost)
    if (cappedBy !== null) return result('capped')
    const call = new AbortController()
    const stop = () => call.abort()
    input.signal.addEventListener('abort', stop, { once: true })
    const callUsage = emptyUsage()
    let final: Anthropic.Message | null = null
    try {
      const stream = input.client.streamAnswer(
        answerParams(input, messages, round === CHAT_LIMITS.toolRoundsPerTurn),
        call.signal,
      )
      for await (const event of stream.events) {
        if (event.type === 'message_start') addUsage(callUsage, event.message.usage)
        if (event.type === 'message_delta') {
          // `message_delta.usage` is cumulative for the call: take its output count as the total.
          callUsage.outputTokens = event.usage.output_tokens ?? callUsage.outputTokens
        }
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const step = filter.push(event.delta.text)
          if (step.released) input.emit({ type: 'delta', text: step.released })
          if (step.blocked) {
            call.abort()
            break
          }
        }
      }
      if (!filter.blocked) final = await stream.finalMessage()
    } catch (error) {
      if (input.signal.aborted) throw error
      if (!filter.blocked) {
        console.error(`[chat] answer call failed: ${error instanceof Error ? error.name : 'error'}`)
        return result('failed')
      }
    } finally {
      input.signal.removeEventListener('abort', stop)
      for (const key of Object.keys(usage) as (keyof TokenUsage)[]) usage[key] += callUsage[key]
      cost += costUsd(input.models.chat, callUsage)
    }
    if (filter.blocked || final === null) return result('blocked')

    const tail = filter.flush()
    if (tail.released) input.emit({ type: 'delta', text: tail.released })
    if (tail.blocked) return result('blocked')

    if (final.stop_reason === 'refusal') {
      labels.push(`refusal:${final.stop_details?.category ?? 'none'}`)
      return result('refused')
    }
    const toolUses = final.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    if (toolUses.length === 0 || final.stop_reason !== 'tool_use') {
      // A tool call cut off at `max_tokens` is never run.
      return result(toolUses.length > 0 ? 'failed' : 'answered')
    }

    messages.push({ role: 'assistant', content: final.content })
    const results: Anthropic.ToolResultBlockParam[] = []
    for (const use of toolUses) {
      const checked = validateToolCall(use.name, use.input, input.tools.site)
      if (!checked.ok) {
        labels.push(`tool_invalid:${use.name.slice(0, 40)}`)
        results.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: checked.reason,
          is_error: true,
        })
        continue
      }
      const outcome = await runTool(checked.call, input.tools)
      labels.push(outcome.label)
      for (const event of outcome.events) {
        if (event.type === 'handoff') handoffShown = true
        input.emit(event)
      }
      results.push({
        type: 'tool_result',
        tool_use_id: use.id,
        content: outcome.content,
        is_error: outcome.isError,
      })
    }
    // Every result of a round in one user message.
    messages.push({ role: 'user', content: results })
  }
  return result('answered')
}
