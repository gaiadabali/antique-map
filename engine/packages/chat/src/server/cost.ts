/**
 * Cost per call (AI.md §7): uncached input × input price + cache reads × read price + cache
 * writes × write price + output × output price, from the `usage` each response reports. List
 * prices as of 2026-09, USD per million tokens — re-checked before launch, and any model change
 * is a config change plus an evaluation run. A model the table does not know is priced at the
 * highest rate in it, so a misconfigured id spends the budget faster, never slower.
 */
import 'server-only'

import type { TokenUsage } from './types'

type Price = { readonly input: number; readonly output: number; readonly cacheRead: number }

export const PRICES_USD_PER_MTOK: Readonly<Record<string, Price>> = {
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2 },
  'claude-haiku-4-5': { input: 1, output: 5, cacheRead: 0.1 },
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2 },
}

/** Prompt-cache writes (5-minute TTL) cost 1.25 × the input price. */
const CACHE_WRITE_FACTOR = 1.25
const UNKNOWN: Price = { input: 10, output: 50, cacheRead: 1 }

export function priceOf(model: string): Price {
  return PRICES_USD_PER_MTOK[model] ?? UNKNOWN
}

export function costUsd(model: string, usage: TokenUsage): number {
  const price = priceOf(model)
  const usd =
    (usage.inputTokens * price.input +
      usage.cacheReadTokens * price.cacheRead +
      usage.cacheWriteTokens * price.input * CACHE_WRITE_FACTOR +
      usage.outputTokens * price.output) /
    1_000_000
  return Math.round(usd * 1_000_000) / 1_000_000
}

export function emptyUsage(): TokenUsage {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }
}

/**
 * The input a session counts against `ai.sessionTokenCap`: uncached input and cache writes. Cache
 * reads (the frozen system prompt and tools, re-read on every call at a tenth of the price) are
 * left out — counted, they would end an ordinary session after a dozen calls — and the daily
 * budget, which prices them, still caps their spend.
 */
export function inputTotal(usage: TokenUsage): number {
  return usage.inputTokens + usage.cacheWriteTokens
}

/** Folds an API `usage` object (any of its fields may be absent or null) into `into`. */
export function addUsage(
  into: TokenUsage,
  usage:
    | {
        input_tokens?: number | null
        output_tokens?: number | null
        cache_read_input_tokens?: number | null
        cache_creation_input_tokens?: number | null
      }
    | null
    | undefined,
): void {
  if (!usage) return
  into.inputTokens += usage.input_tokens ?? 0
  into.outputTokens += usage.output_tokens ?? 0
  into.cacheReadTokens += usage.cache_read_input_tokens ?? 0
  into.cacheWriteTokens += usage.cache_creation_input_tokens ?? 0
}

/**
 * The daily spend per site, in this process (DEPLOYMENT.md: one process). Seeded once per WIB day
 * from the database — the cost recorded on that day's sessions — then kept by adding each call's
 * cost as it happens, so the cap holds even before a turn's record is written.
 */
export class SpendLedger {
  private readonly days = new Map<string, number>()

  constructor(private readonly seed: (site: string, day: string) => Promise<number>) {}

  async spent(site: string, day: string): Promise<number> {
    const key = `${site}:${day}`
    let value = this.days.get(key)
    if (value === undefined) {
      value = await this.seed(site, day)
      // A concurrent seed may have landed first; keep the larger.
      value = Math.max(value, this.days.get(key) ?? 0)
      this.days.set(key, value)
      for (const other of this.days.keys()) if (!other.endsWith(day)) this.days.delete(other)
    }
    return value
  }

  async add(site: string, day: string, usd: number): Promise<void> {
    const key = `${site}:${day}`
    const current = await this.spent(site, day)
    this.days.set(key, current + usd)
  }
}
