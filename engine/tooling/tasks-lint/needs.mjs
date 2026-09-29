// The grammar for one `needs:` token (TASKS.md 2.2.f): a task (`17.1`), a
// subtask (`1.2.f`), a whole phase (`phase N`), or a range of either
// (`10.1–10.3`, `1.2.a–1.2.d` — an en dash, never a hyphen, since task and
// subtask ids already use hyphens nowhere but slugs do not appear here).

const TASK_ID_RE = /^(\d+)\.(\d+)$/
const SUBTASK_ID_RE = /^(\d+)\.(\d+)\.([a-z])$/
const PHASE_RE = /^phase (\d+)$/i

/** `'task' | 'subtask' | 'phase' | null` for one bare (non-range) token. */
function kindOf(token) {
  if (PHASE_RE.test(token)) return 'phase'
  if (SUBTASK_ID_RE.test(token)) return 'subtask'
  if (TASK_ID_RE.test(token)) return 'task'
  return null
}

/**
 * Expands one `needs:` token into the concrete ids it stands for, or
 * `{ error }` when it does not parse at all. A range must have the same kind
 * (task or subtask) at both ends and the same task prefix, letters or
 * numbers increasing left to right — `1.2.a–1.2.d` → `1.2.a,1.2.b,1.2.c,1.2.d`;
 * `10.1–10.3` → `10.1,10.2,10.3`.
 */
/**
 * A `needs:` entry may carry a trailing owner-input note — `19.2.a · 👤 a
 * Midtrans sandbox merchant account and keys` — which documents what the
 * task additionally waits on from the owner, not a resolvable id. Only the
 * part before ` · 👤` is a needs token.
 */
export function stripOwnerNote(token) {
  const cut = token.indexOf(' · 👤')
  return cut === -1 ? token : token.slice(0, cut).trim()
}

/** 10.3's own idiom: "depends on every wave of this phase having merged", not an external id — resolvable with no cross-task ids. */
const WAVE_MERGE_NOTE = "each wave's merge"

export function expandNeedsToken(rawToken) {
  const token = stripOwnerNote(rawToken)
  if (token === '—') return { ids: [] }
  if (token === WAVE_MERGE_NOTE) return { ids: [], intraPhaseNote: true }
  const phaseMatch = PHASE_RE.exec(token)
  if (phaseMatch) return { ids: [], phase: Number(phaseMatch[1]) }
  if (TASK_ID_RE.test(token) || SUBTASK_ID_RE.test(token)) return { ids: [token] }

  const rangeParts = token.split(/–/) // en dash only
  if (rangeParts.length === 2) {
    const [from, to] = rangeParts.map((s) => s.trim())
    const fromKind = kindOf(from)
    const toKind = kindOf(to)
    if (fromKind && fromKind === toKind) {
      if (fromKind === 'task') {
        const [, fp, ft] = TASK_ID_RE.exec(from)
        const [, tp, tt] = TASK_ID_RE.exec(to)
        if (fp === tp && Number(ft) <= Number(tt)) {
          const ids = []
          for (let n = Number(ft); n <= Number(tt); n++) ids.push(`${fp}.${n}`)
          return { ids }
        }
      }
      if (fromKind === 'subtask') {
        const [, fp, ft, fl] = SUBTASK_ID_RE.exec(from)
        const [, tp, tt, tl] = SUBTASK_ID_RE.exec(to)
        if (fp === tp && ft === tt && fl <= tl) {
          const ids = []
          for (let c = fl.charCodeAt(0); c <= tl.charCodeAt(0); c++) {
            ids.push(`${fp}.${ft}.${String.fromCharCode(c)}`)
          }
          return { ids }
        }
      }
    }
  }
  return { error: `does not parse as a task, a subtask, a range or "phase N"` }
}
