/** The shop seed's report as the CLI prints it (DATA.md §4): one block per layer. */
import { render } from '@engine/cms-core/import/report'

import { renderDerivatives } from './derivatives'
import type { ShopSeedRun } from './run'
import { renderCatalogue } from './catalogue/layer'
import { renderShopVocabulary } from './vocabulary/seed'

/** A run's lines; `brief` drops the one line per new, updated or unchanged row (thousands). */
export function renderShopSeedRun(run: ShopSeedRun, options: { brief?: boolean } = {}): string {
  const lines: string[] = [`[${run.layer}]`]
  if (run.vocabulary) lines.push(...renderShopVocabulary(run.vocabulary))
  for (const report of run.imports) lines.push(render(report).trimEnd())
  lines.push(...(run.notes ?? []))
  if (run.catalogue) lines.push(...renderCatalogue(run.catalogue))
  if (run.pictures) lines.push(renderDerivatives(run.pictures))
  const all = lines.join('\n').split('\n')
  return (
    options.brief
      ? all.filter((line) => !/^Row \d+ .*\) (new|updated|unchanged)\b/.test(line))
      : all
  ).join('\n')
}
