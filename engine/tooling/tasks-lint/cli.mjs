#!/usr/bin/env node
// `pnpm tasks:lint [--phase <n> --wave <k>]` — TASKS.md 2.2.f.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { allTasks, parseTasksMd } from './parse.mjs'
import {
  ALL_RULES,
  checkRequirementsCovered,
} from './rules.mjs'
import { checkWaveReadiness } from './wave.mjs'

const args = process.argv.slice(2)
const repoRoot = process.cwd()
const text = readFileSync(join(repoRoot, 'TASKS.md'), 'utf8')
const model = parseTasksMd(text)
const tasks = allTasks(model)

function valueOf(flag) {
  const i = args.indexOf(flag)
  return i === -1 ? undefined : args[i + 1]
}

const phaseArg = valueOf('--phase')
const waveArg = valueOf('--wave')

if (phaseArg !== undefined || waveArg !== undefined) {
  if (phaseArg === undefined || waveArg === undefined) {
    console.error('usage: tasks:lint --phase <n> --wave <k>')
    process.exit(2)
  }
  const { ready, blockers } = checkWaveReadiness(model, tasks, Number(phaseArg), `W${waveArg}`)
  if (ready) {
    console.log(`tasks-lint: phase ${phaseArg} · W${waveArg} is ready to dispatch`)
    process.exit(0)
  }
  console.error(`tasks-lint: phase ${phaseArg} · W${waveArg} is NOT ready:`)
  for (const b of blockers) console.error(`  ${b}`)
  process.exit(1)
}

const findings = ALL_RULES.flatMap((rule) => rule(model, tasks))
findings.push(...checkRequirementsCovered(repoRoot, tasks))

console.log(`tasks-lint: ${model.phases.length} phase(s), ${tasks.length} task(s) parsed`)
if (findings.length === 0) {
  console.log('tasks-lint: ok, no structural defects')
  process.exit(0)
}

console.error(`tasks-lint: ${findings.length} finding(s)`)
for (const f of findings) {
  console.error(`  [${f.rule}]${f.line ? ` line ${f.line}:` : ''} ${f.message}`)
}
process.exit(1)
