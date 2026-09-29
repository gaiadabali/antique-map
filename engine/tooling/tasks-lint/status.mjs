// 3.3.d — the status suffixes the board's own rules put on a task line
// (TASKS.md "How to update this file"), after its `· needs: …` list:
//
//   — ✅ 2026-09-30 ff71f66   done: the day and short sha of the merge (rule 4)
//   — 🔄 17·W2                dispatched: its phase and wave (rule 2)
//   — ⛔ <reason>             blocked, e.g. `— ⛔ 👤 D14` (rule 6)
//   — ✂️ cut: <reason>        dropped, never deleted; it stops counting (rule 7)
//
// A line may carry more than one (`— 🔄 3·W2 — ⛔ 👤 D14`: in flight, then
// blocked); which combinations make sense is `status-rules.mjs`'s question.

/** Each marker, as written; ✂️ is U+2702 with or without its emoji selector U+FE0F. */
const MARKER = '(?:✅|🔄|⛔|✂️?)'
/** Where the suffixes start: the first ` — ` followed by a marker. */
const SUFFIX_START_RE = new RegExp(` — (?=${MARKER})`, 'u')
const SEGMENT_SPLIT_RE = new RegExp(` — (?=${MARKER})`, 'gu')

const GRAMMAR = [
  {
    kind: 'done',
    re: /^✅ (\d{4}-\d{2}-\d{2}) ([0-9a-f]{6,})$/u,
    fields: (m) => ({ date: m[1], sha: m[2] }),
    form: '✅ YYYY-MM-DD <short sha>',
  },
  {
    kind: 'doing',
    re: /^🔄 (\d+)\s*·\s*(W\d)$/u,
    fields: (m) => ({ phase: Number(m[1]), wave: m[2] }),
    form: '🔄 <phase>·W<k>',
  },
  {
    kind: 'blocked',
    re: /^⛔ (\S.*)$/u,
    fields: (m) => ({ reason: m[1].trim() }),
    form: '⛔ <reason>',
  },
  {
    kind: 'cut',
    re: /^✂️? cut: (\S.*)$/u,
    fields: (m) => ({ reason: m[1].trim() }),
    form: '✂️ cut: <reason>',
  },
]

const KIND_OF_MARKER = [
  ['✅', 'done'],
  ['🔄', 'doing'],
  ['⛔', 'blocked'],
  ['✂', 'cut'],
]

/** One suffix segment (without its leading ` — `) → `{ kind, raw, …fields }`, or `malformed`. */
function parseSegment(raw) {
  const text = raw.trim()
  for (const { kind, re, fields } of GRAMMAR) {
    const match = re.exec(text)
    if (match) return { kind, raw: text, ...fields(match) }
  }
  const kind = KIND_OF_MARKER.find(([marker]) => text.startsWith(marker))?.[1] ?? null
  const form = GRAMMAR.find((g) => g.kind === kind)?.form
  return { kind, raw: text, malformed: `"${text}" is not "${form}"` }
}

/**
 * Splits the text after `· needs: ` into the needs list and its status suffixes:
 * `{ needsRaw, statuses }`. With no suffix, `statuses` is empty.
 */
export function splitStatusSuffix(needsAndRest) {
  const start = SUFFIX_START_RE.exec(needsAndRest)
  if (!start) return { needsRaw: needsAndRest, statuses: [] }
  const tail = needsAndRest.slice(start.index + 3) // past ' — '
  return {
    needsRaw: needsAndRest.slice(0, start.index),
    statuses: tail.split(SEGMENT_SPLIT_RE).map(parseSegment),
  }
}

/**
 * The one state a task is in, strongest first: `cut` (it no longer counts), `done`,
 * `blocked`, `doing`, or `open`. A malformed suffix still names its kind.
 */
export function statusOf(statuses) {
  const kinds = new Set(statuses.map((s) => s.kind))
  for (const kind of ['cut', 'done', 'blocked', 'doing']) if (kinds.has(kind)) return kind
  return 'open'
}

/** True for a task marked ✂️: it stays in the file, but stops counting (TASKS.md rule 7). */
export function isCut(task) {
  return task.status === 'cut'
}

/** The first suffix of `kind` on the task, or undefined. */
export function statusEntry(task, kind) {
  return task.statuses.find((s) => s.kind === kind)
}
