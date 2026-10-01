// Every dynamic `import()` in a module's code, and what its argument is: a string the walk can
// follow, or an expression it cannot (TASKS.md 4.7.a). A bundler turns `import(m)` into a chunk
// of whatever `m` may name — a context over a folder, or a runtime `require` — so an argument
// no one can read is a reach no one checked, and the gate fails it rather than skip it.
//
// A light scan, not a parser: it steps over comments, strings, template literals (their `${…}`
// scanned as code) and regular-expression literals, so prose that mentions `import(x)` is not
// code. Where it has to guess — a `/` that may start a regex, a quote in JSX text — the guess
// stops at the end of the line, so a misread hides no more than that line. Literal specifiers
// are still read by the walk's own pattern over the raw text as well: this scan only adds.

const WORD = /[\w$]/
/** After these words an expression starts, so a `/` begins a regular expression. */
const BEFORE_EXPRESSION = new Set(
  'return typeof instanceof in of new delete void throw case do else yield await'.split(' '),
)
/** How much of an expression a report quotes. */
const SHOWN = 60

/** The index after a `'`/`"` string opened at `at`; an unclosed one ends at its line. */
function afterQuoted(source, at) {
  const quote = source[at]
  let i = at + 1
  while (i < source.length && source[i] !== quote && source[i] !== '\n')
    i += source[i] === '\\' ? 2 : 1
  return Math.min(i + 1, source.length)
}

/** The index after a regex literal opened at `at`, or `null` when none closes on its line. */
function afterRegex(source, at) {
  let inClass = false
  for (let i = at + 1; i < source.length && source[i] !== '\n'; i += 1) {
    const c = source[i]
    if (c === '\\') i += 1
    else if (c === '[') inClass = true
    else if (c === ']') inClass = false
    else if (c === '/' && !inClass) {
      let end = i + 1
      while (end < source.length && WORD.test(source[end] ?? '')) end += 1
      return end
    }
  }
  return null
}

/** Skips whitespace and comments from `at`; returns the index of the next token. */
function skipTrivia(source, at) {
  let i = at
  for (;;) {
    while (i < source.length && /\s/.test(source[i] ?? '')) i += 1
    if (source.startsWith('//', i)) {
      const end = source.indexOf('\n', i)
      i = end === -1 ? source.length : end + 1
    } else if (source.startsWith('/*', i)) {
      const end = source.indexOf('*/', i + 2)
      i = end === -1 ? source.length : end + 2
    } else return i
  }
}

/** The source of the argument list opened at `open` (the `(`), up to its matching `)`. */
function argumentText(source, open) {
  let depth = 0
  let i = open
  while (i < source.length) {
    const c = source[i]
    if (c === "'" || c === '"' || c === '`') {
      i = c === '`' ? source.indexOf('`', i + 1) + 1 || source.length : afterQuoted(source, i)
      continue
    }
    if (c === '(') depth += 1
    else if (c === ')' && (depth -= 1) === 0) break
    i += 1
  }
  const text = source
    .slice(open + 1, i)
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > SHOWN ? `${text.slice(0, SHOWN - 1)}…` : text
}

/** What `import(` at `open` loads: `{ specifier }` for a plain string, else `{ expression }`. */
function readArgument(source, open) {
  const start = skipTrivia(source, open + 1)
  const quote = source[start]
  let end = null
  if (quote === "'" || quote === '"') end = afterQuoted(source, start)
  else if (quote === '`') {
    const close = source.indexOf('`', start + 1)
    const body = close === -1 ? '' : source.slice(start + 1, close)
    if (close !== -1 && !body.includes('${')) end = close + 1
  }
  if (end !== null) {
    const next = source[skipTrivia(source, end)]
    // `import('x', { with: … })` still loads the string: the second argument is attributes.
    if (next === ')' || next === ',') return { specifier: source.slice(start + 1, end - 1) }
  }
  return { expression: argumentText(source, open) }
}

/**
 * Each dynamic `import()` in `source`'s code, in order: `{ specifier }` when its argument is a
 * plain string (a template literal with no `${…}` is one), `{ expression }` — the argument's
 * source — when it is anything else.
 */
export function dynamicImports(source) {
  const found = []
  /** Each open `{`: `true` when it is a template literal's `${`. */
  const braces = []
  let inTemplate = false
  let regexCanStart = true
  let previous = ''
  let i = 0
  while (i < source.length) {
    const c = source[i] ?? ''
    if (inTemplate) {
      if (c === '\\') i += 2
      else if (c === '`') [inTemplate, regexCanStart, i] = [false, false, i + 1]
      else if (c === '$' && source[i + 1] === '{') {
        braces.push(true)
        ;[inTemplate, regexCanStart, i] = [false, true, i + 2]
      } else i += 1
      continue
    }
    if (/\s/.test(c) || source.startsWith('//', i) || source.startsWith('/*', i)) {
      i = skipTrivia(source, i)
      continue
    }
    if (c === "'" || c === '"') {
      ;[i, regexCanStart] = [afterQuoted(source, i), false]
    } else if (c === '`') {
      ;[inTemplate, i] = [true, i + 1]
    } else if (c === '/') {
      const end = regexCanStart ? afterRegex(source, i) : null
      ;[i, regexCanStart] = end === null ? [i + 1, true] : [end, false]
    } else if (WORD.test(c)) {
      let end = i
      while (end < source.length && WORD.test(source[end] ?? '')) end += 1
      const word = source.slice(i, end)
      const open = skipTrivia(source, end)
      if (word === 'import' && previous !== '.' && source[open] === '(') {
        found.push(readArgument(source, open))
      }
      ;[i, regexCanStart] = [end, BEFORE_EXPRESSION.has(word)]
    } else if (c === '{') {
      braces.push(false)
      ;[i, regexCanStart] = [i + 1, true]
    } else if (c === '}') {
      inTemplate = braces.pop() === true
      ;[i, regexCanStart] = [i + 1, true]
    } else {
      ;[i, regexCanStart] = [i + 1, c !== ')' && c !== ']']
    }
    previous = c
  }
  return found
}
