/**
 * The gate before any model call (AI.md §2.1 step 1, §3.2), in order: the kill switch, the
 * session's message cap, a Turnstile re-challenge, the session's token cap, the day's budget.
 * (Rate limits and the input length are checked by the route before the session is read.) A
 * refused turn spends nothing and is answered with the error and, where it helps, the handoff
 * buttons — the visitor can always reach the team.
 */
import 'server-only'

import { CHAT_LIMITS, secondsToWibMidnight } from '../env'
import type { ChatErrorCode, ChatSessionRecord, ChatSettings } from '../types'

export type Refusal = {
  readonly code: ChatErrorCode
  readonly status: number
  readonly retryAfter?: number
  /** Whether the answer carries the WhatsApp and email buttons. */
  readonly handoff: boolean
}

export const PASS_LABEL = 'turnstile:pass@'
export const RECHALLENGE_LABEL = 'turnstile:rechallenge'

export function userMessages(session: ChatSessionRecord): number {
  return session.transcript.filter((entry) => entry.role === 'user').length
}

/** Whether the session must pass Turnstile again before its next message. */
export function needsChallenge(session: ChatSessionRecord): boolean {
  let lastPass = -1
  let passedAt: number | null = null
  let lastRechallenge = -1
  for (const [index, label] of session.labels.entries()) {
    if (label.startsWith(PASS_LABEL)) {
      lastPass = index
      passedAt = Number(label.slice(PASS_LABEL.length))
    } else if (label === RECHALLENGE_LABEL) {
      lastRechallenge = index
    }
  }
  if (passedAt === null || !Number.isInteger(passedAt)) return true
  if (lastRechallenge > lastPass) return true
  return userMessages(session) - passedAt >= CHAT_LIMITS.rechallengeEvery
}

export function sessionOverCap(session: ChatSessionRecord, settings: ChatSettings): boolean {
  const cap = settings.ai.sessionTokenCap > 0 ? settings.ai.sessionTokenCap : 150_000
  return (
    session.usage.inputTokens >= cap ||
    session.usage.outputTokens >= CHAT_LIMITS.sessionOutputTokenCap
  )
}

export function overBudget(spentUsd: number, settings: ChatSettings): boolean {
  return spentUsd >= Math.max(0, settings.ai.dailyBudgetUsd)
}

export function gateTurn(input: {
  readonly session: ChatSessionRecord
  readonly settings: ChatSettings
  readonly spentTodayUsd: number
  readonly now: Date
}): Refusal | null {
  const { session, settings } = input
  if (!settings.ai.chatEnabled) return { code: 'disabled', status: 503, handoff: true }
  if (userMessages(session) >= CHAT_LIMITS.messagesPerSession) {
    return { code: 'session_limit', status: 403, handoff: true }
  }
  if (needsChallenge(session)) return { code: 'challenge_required', status: 403, handoff: false }
  if (sessionOverCap(session, settings))
    return { code: 'session_limit', status: 403, handoff: true }
  if (overBudget(input.spentTodayUsd, settings)) {
    return {
      code: 'budget_exhausted',
      status: 503,
      retryAfter: secondsToWibMidnight(input.now),
      handoff: true,
    }
  }
  return null
}
