/**
 * The drafting tool's limits (TASKS.md 8.3 item 5): one draft per work at a time, and 20 drafts
 * per user per hour. Held in this process, as the chat's are (`apps/web/src/server/chat/limits`):
 * exact while there is one app process (DEPLOYMENT.md: fork mode). A run that fails still counts —
 * it was a call.
 */
export const DRAFT_LIMITS = {
  perUserPerHour: 20,
  windowMs: 60 * 60 * 1000,
} as const

export class DraftLimiter {
  private readonly runs = new Map<string, number[]>()
  private readonly busy = new Set<string>()

  constructor(
    private readonly max: number = DRAFT_LIMITS.perUserPerHour,
    private readonly windowMs: number = DRAFT_LIMITS.windowMs,
  ) {}

  /** Seconds until `user` may draft again, or 0 — recording the run when it is allowed. */
  take(user: string, now: number): number {
    const recent = (this.runs.get(user) ?? []).filter((at) => at > now - this.windowMs)
    if (recent.length >= this.max) {
      this.runs.set(user, recent)
      return Math.max(1, Math.ceil(((recent[0] ?? now) + this.windowMs - now) / 1000))
    }
    recent.push(now)
    this.runs.set(user, recent)
    return 0
  }

  /** Holds the work's one draft; `false` while another is running. */
  begin(work: string): boolean {
    if (this.busy.has(work)) return false
    this.busy.add(work)
    return true
  }

  end(work: string): void {
    this.busy.delete(work)
  }
}
