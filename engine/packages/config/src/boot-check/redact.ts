/**
 * Strips credentials from text bound for a log: a driver's or a reader's error message can
 * quote a connection string, and libpq's connection strings take a password in three places:
 * - a URL's userinfo, `postgres://user:pass@host/db` — matched up to the LAST `@` before the next
 *   space, so a password holding `@` or a raw `/` (`u:p@ss@host`, `app:Zx9/k+Qw==@db`) leaks
 *   nothing; an `@` later in the URL hides its host too, which costs a log line its detail,
 *   never a secret;
 * - a URL's query, `postgres://host/db?sslmode=require&password=pass` — up to the next `&`, `#`
 *   or space;
 * - a keyword/value string, `host=db user=app password=pass` — the value to the next space, or
 *   quoted, single or double, with backslash escapes (`password='p a\'ss'`, `password="p a ss"`),
 *   spaces around `=` allowed;
 * and a JSON body may carry one (`"password":"pass"`). Any key ending in `password` counts
 * (`sslpassword`, `PGPASSWORD`). CONVENTIONS.md §13: a secret never reaches a log.
 */
const USERINFO = /\b([a-z][a-z0-9+.-]*:\/\/)[^\s]*@/gi
const QUERY_PASSWORD = /([?&]\w*password=)[^&#\s]*/gi
const PAIR_PASSWORD =
  /(^|[^\w?&])(\w*password\s*=\s*)(?:'(?:\\.|[^'\\])*'?|"(?:\\.|[^"\\])*"?|[^\s'"]*)/gi
const JSON_PASSWORD = /("\w*password"\s*:\s*)"(?:\\.|[^"\\])*"/gi

export function redactCredentials(text: string): string {
  return text
    .replace(USERINFO, '$1…@')
    .replace(QUERY_PASSWORD, '$1…')
    .replace(JSON_PASSWORD, '$1"…"')
    .replace(PAIR_PASSWORD, '$1$2…')
}

/** An error's message, redacted. */
export function describeError(error: unknown): string {
  return redactCredentials(error instanceof Error ? error.message : String(error))
}
