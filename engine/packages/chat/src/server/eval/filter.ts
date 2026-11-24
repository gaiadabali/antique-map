/** `--only <id,id>` / `--group <g,g>` filters for a partial (smoke) run; both optional, ANDed. */
import type { EvalCase } from './schema'

export type CaseFilter = { readonly only?: readonly string[]; readonly group?: readonly string[] }

export function filterCases(cases: readonly EvalCase[], filter: CaseFilter): readonly EvalCase[] {
  return cases.filter(
    (c) =>
      (!filter.only?.length || filter.only.includes(c.id)) &&
      (!filter.group?.length || filter.group.includes(c.group)),
  )
}

export function parseList(value: string | undefined): readonly string[] | undefined {
  const list = value
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return list?.length ? list : undefined
}
