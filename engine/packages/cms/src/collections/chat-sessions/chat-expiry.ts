/**
 * Compute when a chat session expires: 30 days after its last message (AI.md §3.4).
 * Exported as a pure function for unit testing.
 */
export const CHAT_RETENTION_DAYS = 30

export function chatExpiry(lastMessageAt: Date): Date {
  const d = new Date(lastMessageAt)
  d.setUTCDate(d.getUTCDate() + CHAT_RETENTION_DAYS)
  return d
}
