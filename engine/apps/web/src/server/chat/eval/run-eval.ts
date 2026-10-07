/**
 * The eval runner's orchestration (ticket 8.4b): loads the golden set, drives each case through
 * `./run-case` against a recorded or live model, grades it (`./grade`), and rolls the results up
 * into `./report`. Assumes it runs with the repo root as the working directory (the CLI invokes it
 * that way; so does the vitest process).
 */
import 'server-only'

import fs from 'node:fs'
import path from 'node:path'

import type { ChatModels } from '../env'
import type { ChatModelClient } from '../ports'
import { runCase } from './run-case'
import { gradeCase } from './grade'
import { loadRecording, saveRecording } from './recording'
import { RecordedModel } from './recorded-model'
import { CapturingModel, evalModels, liveModel } from './live-model'
import { validateCase, type EvalCase } from './schema'
import type { CaseResult, EvalReport } from './report'

export const RECORDINGS_DIR = path.join('tests', 'ai', 'recordings')
export const OUT_DIR = path.join('tests', 'ai', 'out')

export function loadCases(): readonly EvalCase[] {
  const casesDir = path.join(import.meta.dirname, 'cases')
  const files = fs.readdirSync(casesDir).filter((f) => f.endsWith('.json'))
  return files.flatMap((file) => {
    const raw = JSON.parse(fs.readFileSync(path.join(casesDir, file), 'utf8')) as unknown[]
    return raw.map((item) => validateCase(item))
  })
}

export type RunEvalOptions = {
  readonly live?: boolean
  readonly record?: boolean
  readonly maxUsd?: number
  readonly env?: Readonly<Record<string, string | undefined>>
}

export type RunEvalResult =
  | { readonly ok: true; readonly report: EvalReport }
  | { readonly ok: false; readonly reason: string }

async function runOneRecorded(evalCase: EvalCase): Promise<CaseResult> {
  const recording = loadRecording(RECORDINGS_DIR, evalCase.id)
  if (recording === null) {
    return {
      id: evalCase.id,
      site: evalCase.site,
      locale: evalCase.locale,
      group: evalCase.group,
      safety: evalCase.safety,
      pass: false,
      reasons: ['no recording'],
      outcome: null,
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
    }
  }
  const model = new RecordedModel(recording)
  const outcome = await runCase(evalCase, model, () => model.nextTurn(), models)
  return toResult(evalCase, outcome)
}

function toResult(evalCase: EvalCase, outcome: Awaited<ReturnType<typeof runCase>>): CaseResult {
  if (!outcome.ok) {
    return {
      id: evalCase.id,
      site: evalCase.site,
      locale: evalCase.locale,
      group: evalCase.group,
      safety: evalCase.safety,
      pass: false,
      reasons: [outcome.reason],
      outcome: null,
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
    }
  }
  const grade = gradeCase({
    evalCase,
    idOfFixture: outcome.idOfFixture,
    turnEvents: outcome.turnEvents,
    session: outcome.session,
  })
  const last = outcome.turnEvents.at(-1)
  const done = last?.find((e) => e.type === 'done')
  return {
    id: evalCase.id,
    site: evalCase.site,
    locale: evalCase.locale,
    group: evalCase.group,
    safety: evalCase.safety,
    pass: grade.pass,
    reasons: grade.reasons,
    outcome: done?.type === 'done' ? done.outcome : null,
    tokensIn: outcome.session.usage.inputTokens,
    tokensOut: outcome.session.usage.outputTokens,
    costUsd: outcome.session.usage.costUsd,
  }
}

async function runOneLive(
  evalCase: EvalCase,
  client: ChatModelClient,
  record: boolean,
  models: ChatModels,
): Promise<CaseResult> {
  const model = new CapturingModel(client, evalCase.id)
  const outcome = await runCase(evalCase, model, () => model.nextTurn(), models)
  if (record) saveRecording(RECORDINGS_DIR, model.recording())
  return toResult(evalCase, outcome)
}

export async function runEval(options: RunEvalOptions = {}): Promise<RunEvalResult> {
  const env = options.env ?? process.env
  const maxUsd = options.maxUsd ?? 3
  const cases = loadCases()
  const results: CaseResult[] = []
  let stoppedEarly = false

  if (options.live) {
    const client = liveModel(env)
    if (client === null) {
      return { ok: false, reason: 'ANTHROPIC_API_KEY is unset: live mode needs a key' }
    }
    const models = evalModels(env)
    let totalCost = 0
    for (const evalCase of cases) {
      if (totalCost >= maxUsd) {
        stoppedEarly = true
        break
      }
      const result = await runOneLive(evalCase, client, options.record === true, models)
      results.push(result)
      totalCost += result.costUsd
    }
  } else {
    for (const evalCase of cases) {
      results.push(await runOneRecorded(evalCase))
    }
  }

  const totalCostUsd = results.reduce((sum, r) => sum + r.costUsd, 0)
  return {
    ok: true,
    report: {
      mode: options.live ? 'live' : 'recorded',
      at: new Date().toISOString(),
      results,
      totalCostUsd,
      stoppedEarly,
    },
  }
}

export function writeReport(report: EvalReport): string {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const file = path.join(OUT_DIR, `${report.at.replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  return file
}
