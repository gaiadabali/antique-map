/**
 * What a config check reports: the field it names, as a path into the file, and one sentence
 * that says what is wrong and what would make it right. A path is printed the way a reader
 * finds the field in the JSON — `modules['retention.wantList']`, `sellers[1].charge` — so the
 * message names the field without anyone decoding it (TASKS.md 3.1.e).
 */

export type ConfigPath = readonly (string | number)[]

export type ConfigIssue = {
  readonly path: ConfigPath
  readonly message: string
}

/** Collects issues; every rule takes one. */
export type Report = (path: ConfigPath, message: string) => void

const PLAIN_KEY = /^[A-Za-z_$][\w$]*$/

/** `['modules', 'retention.wantList']` → `modules['retention.wantList']`; `[]` → `(the file)`. */
export function formatPath(path: ConfigPath): string {
  if (path.length === 0) return '(the file)'
  return path
    .map((part, i) => {
      if (typeof part === 'number') return `[${part}]`
      if (PLAIN_KEY.test(part)) return i === 0 ? part : `.${part}`
      return `['${part}']`
    })
    .join('')
}

export function formatIssue(issue: ConfigIssue): string {
  return `${formatPath(issue.path)}: ${issue.message}`
}

/** A collector and the issues it has gathered, in the order they were found. */
export function collectIssues(): { readonly issues: ConfigIssue[]; readonly report: Report } {
  const issues: ConfigIssue[] = []
  return { issues, report: (path, message) => void issues.push({ path, message }) }
}
