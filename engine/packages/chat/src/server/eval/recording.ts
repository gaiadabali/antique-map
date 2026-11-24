/**
 * A case's recorded model replies (AI.md §6, ticket 8.4b): one entry per visitor turn, each the
 * classifier's label and the answer call(s) for that turn in order. Recorded mode (the default,
 * CI) plays these back with no network; `--record` overwrites them from a live run. A case with no
 * recording file fails ("no recording") — it is never silently skipped.
 */
import 'server-only'

import fs from 'node:fs'
import path from 'node:path'

import type { ClassifierLabel } from '../types'
import type { ScriptedReply } from '../test-support/fake-model'

export type RecordedTurn = {
  readonly classifierLabel: ClassifierLabel | null
  /** One scripted reply per answer-call round, in order. */
  readonly calls: readonly ScriptedReply[]
}

export type Recording = {
  readonly caseId: string
  readonly turns: readonly RecordedTurn[]
}

export function recordingPath(dir: string, caseId: string): string {
  return path.join(dir, `${caseId}.json`)
}

/** `null` when the case has no recording file — the caller fails the case, never skips it. */
export function loadRecording(dir: string, caseId: string): Recording | null {
  const file = recordingPath(dir, caseId)
  if (!fs.existsSync(file)) return null
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown
  return raw as Recording
}

export function saveRecording(dir: string, recording: Recording): void {
  fs.mkdirSync(dir, { recursive: true })
  const file = recordingPath(dir, recording.caseId)
  fs.writeFileSync(file, `${JSON.stringify(recording, null, 2)}\n`, 'utf8')
}
