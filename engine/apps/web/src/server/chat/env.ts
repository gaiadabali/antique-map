/**
 * The chat's configuration (AI.md §1, §3.2; DEPLOYMENT.md env table). Model ids are config, never
 * code: changing one is an env change plus an evaluation run. Every secret is read here and only
 * here, handed to the adapter that needs it, and never logged or put in an error message.
 *
 * Env names (documented in DEPLOYMENT.md): `AI_CHAT_MODEL` and `AI_CLASSIFY_MODEL`; the shorter
 * `CHAT_MODEL` and `CHAT_CLASSIFIER_MODEL` are read as aliases when the documented name is unset.
 */
import 'server-only'

export type Env = Readonly<Record<string, string | undefined>>

export const DEFAULT_CHAT_MODEL = 'claude-sonnet-5-5'
export const DEFAULT_CLASSIFY_MODEL = 'claude-haiku-4-5'
const EFFORTS = ['low', 'medium', 'high'] as const
export type ChatEffort = (typeof EFFORTS)[number]

export type ChatModels = {
  readonly chat: string
  readonly classify: string
  readonly effort: ChatEffort
}

const MODEL_ID = /^[a-z0-9][a-z0-9.\-_:@]{2,80}$/

function modelFrom(env: Env, names: readonly string[], fallback: string): string {
  for (const name of names) {
    const value = env[name]?.trim()
    if (value && MODEL_ID.test(value)) return value
  }
  return fallback
}

export function chatModels(env: Env = process.env): ChatModels {
  const effort = env.AI_CHAT_EFFORT?.trim() as ChatEffort | undefined
  return {
    chat: modelFrom(env, ['AI_CHAT_MODEL', 'CHAT_MODEL'], DEFAULT_CHAT_MODEL),
    classify: modelFrom(
      env,
      ['AI_CLASSIFY_MODEL', 'CHAT_CLASSIFIER_MODEL'],
      DEFAULT_CLASSIFY_MODEL,
    ),
    effort: effort && EFFORTS.includes(effort) ? effort : 'low',
  }
}

/** A secret from the environment, or `null`: never a default, never logged. */
export function secretFrom(env: Env, name: string): string | null {
  const value = env[name]
  return value !== undefined && value.trim().length >= 16 ? value.trim() : null
}

/** AI.md §3.2 — the defaults; `site-settings` tunes the budget and the token cap. */
export const CHAT_LIMITS = {
  /** Characters per visitor message; longer is refused (`too_long`), never truncated. */
  maxMessageChars: 1000,
  /** Visitor messages per session; the next one is refused with the handoff. */
  messagesPerSession: 30,
  /** One message per this many milliseconds per session. */
  messageIntervalMs: 2000,
  /** Messages per hour per client address. */
  messagesPerIpPerHour: 60,
  /** New sessions per hour per client address. */
  sessionsPerIpPerHour: 6,
  /** Re-challenge with Turnstile after this many messages since the last challenge. */
  rechallengeEvery: 15,
  /** Output tokens across a session (AI.md §3.2: 150,000 input + 8,000 output). */
  sessionOutputTokenCap: 8000,
  /** Tool rounds per turn (AI.md §2.1 step 5). */
  toolRoundsPerTurn: 4,
  /** `max_tokens` for one answer call: answers are short. */
  answerMaxTokens: 1024,
  /** `max_tokens` for the classifier (AI.md §2.1: ~256). */
  classifyMaxTokens: 256,
  /** A tool result's serialised size cap, in characters. */
  toolResultMaxChars: 6000,
  /** How long a lead-form consent token stays valid. */
  consentTtlMs: 30 * 60 * 1000,
  /** Body size cap for every chat route, in bytes. */
  maxBodyBytes: 8 * 1024,
} as const

/** WIB is UTC+7 (no daylight saving): the daily budget resets at midnight WIB (AI.md §3.2). */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

/** The WIB calendar day of `now`, `YYYY-MM-DD`. */
export function wibDay(now: Date): string {
  return new Date(now.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10)
}

/** The instant the WIB day of `now` started. */
export function wibDayStart(now: Date): Date {
  return new Date(Date.parse(`${wibDay(now)}T00:00:00.000Z`) - WIB_OFFSET_MS)
}

/** Seconds until the next midnight WIB, at least 1. */
export function secondsToWibMidnight(now: Date): number {
  const next = wibDayStart(now).getTime() + 24 * 60 * 60 * 1000
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000))
}
