/**
 * The chat's rate limits (AI.md §3.2, SECURITY.md §2.10), in this process — exact while there is
 * one (DEPLOYMENT.md: fork mode). Keyed on the client address nginx sets; the address is held in
 * memory only for the window and never stored or logged (the session keeps a daily-salted hash).
 *
 * - sessions: 6 per hour per address;
 * - messages: 60 per hour per address, one per 2 s per session, one turn at a time per session;
 * - lead submissions from the consent form: 5 per hour per address.
 */
import 'server-only'

import { CHAT_LIMITS } from './env'

const HOUR = 60 * 60 * 1000

/** A sliding-window counter: at most `max` hits per `windowMs` per key. */
export class SlidingWindow {
  private readonly hits = new Map<string, number[]>()

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** Records a hit and answers 0, or answers the seconds until one is allowed (recording none). */
  take(key: string, now: number): number {
    const recent = (this.hits.get(key) ?? []).filter((at) => at > now - this.windowMs)
    if (recent.length >= this.max) {
      this.hits.set(key, recent)
      return Math.max(1, Math.ceil(((recent[0] ?? now) + this.windowMs - now) / 1000))
    }
    recent.push(now)
    this.hits.set(key, recent)
    if (this.hits.size > 50_000) this.prune(now)
    return 0
  }

  private prune(now: number): void {
    for (const [key, times] of this.hits) {
      if (times.every((at) => at <= now - this.windowMs)) this.hits.delete(key)
    }
  }
}

export class ChatLimiter {
  readonly sessionsPerIp = new SlidingWindow(CHAT_LIMITS.sessionsPerIpPerHour, HOUR)
  readonly messagesPerIp = new SlidingWindow(CHAT_LIMITS.messagesPerIpPerHour, HOUR)
  readonly messagePace = new SlidingWindow(1, CHAT_LIMITS.messageIntervalMs)
  /** Lead submissions: 5 per hour per address, as every lead form (SECURITY.md §2.10). */
  readonly leadsPerIp = new SlidingWindow(5, HOUR)
  private readonly inFlight = new Set<string>()

  /** Holds the session's one turn; `false` while another is running. */
  begin(sessionId: string): boolean {
    if (this.inFlight.has(sessionId)) return false
    this.inFlight.add(sessionId)
    return true
  }

  end(sessionId: string): void {
    this.inFlight.delete(sessionId)
  }
}
