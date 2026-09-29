/**
 * Strips credentials from text bound for a log: a driver's or a reader's error message can
 * quote a connection string (`postgres://user:pass@host/db`). The userinfo is matched up to
 * the LAST `@` before the host, so a password holding `@` (`u:p@ss@host`) leaks nothing.
 * CONVENTIONS.md §13: a secret never reaches a log.
 */
export function redactCredentials(text: string): string {
  return text.replace(/\b([a-z][a-z0-9+.-]*:\/\/)[^\s/]*@/gi, '$1…@')
}

/** An error's message, redacted. */
export function describeError(error: unknown): string {
  return redactCredentials(error instanceof Error ? error.message : String(error))
}
