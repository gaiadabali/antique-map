/**
 * An intake batch's manifest as read from the bucket (C9 `IntakeManifest`, `intakeManifestKey()`;
 * intake-spec.md §7): untrusted JSON until every field is checked against C9's value lists. The
 * pilot set (OA3) is kept by key and manifest from the day it arrives, before any collection
 * exists, so this is the one shape both the reviewer's tool and the import read.
 */
import {
  CAPTURE_TIERS,
  INTAKE_VERDICTS,
  MEDIA_PROVENANCES,
  RETOUCHING_STATES,
  type IntakeEntry,
  type IntakeManifest,
} from '@engine/media/contract'
import { isSha256Hex } from '@engine/media/storage'

import { MASTER_ROLES } from './fields'

type Raw = Record<string, unknown>
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const EXTENSION = /^[a-z0-9]{1,8}$/

const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0
const isWhole = (value: unknown) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0
const oneOf = (values: readonly string[], value: unknown) =>
  typeof value === 'string' && values.includes(value)

function entryProblems(entry: Raw, at: string): string[] {
  const problems: string[] = []
  const need = (ok: boolean, what: string) => {
    if (!ok) problems.push(`${at}.${what}`)
  }
  need(isSha256Hex(entry.checksum), 'checksum: a SHA-256 in 64 lower-case hex digits')
  need(
    typeof entry.extension === 'string' && EXTENSION.test(entry.extension),
    'extension: 1–8 lower-case letters or digits',
  )
  need(isText(entry.receivedAs), 'receivedAs: the name it was handed over under')
  need(isText(entry.reference), 'reference: what it is of')
  need(oneOf(MASTER_ROLES, entry.role), `role: one of ${MASTER_ROLES.join(', ')}`)
  need(
    oneOf(MEDIA_PROVENANCES, entry.provenance),
    `provenance: one of ${MEDIA_PROVENANCES.join(', ')}`,
  )
  need(isWhole(entry.widthPx) && isWhole(entry.heightPx), "widthPx, heightPx: the frame's pixels")
  need(entry.objectPpi === null || isWhole(entry.objectPpi), 'objectPpi: a whole number, or null')
  need(
    entry.captureTier === null || oneOf(CAPTURE_TIERS, entry.captureTier),
    'captureTier: a tier, or null',
  )
  need(oneOf(INTAKE_VERDICTS, entry.verdict), `verdict: one of ${INTAKE_VERDICTS.join(', ')}`)
  need(
    oneOf(RETOUCHING_STATES, entry.retouching),
    `retouching: one of ${RETOUCHING_STATES.join(', ')}`,
  )
  need(Array.isArray(entry.notes) && entry.notes.every(isText), 'notes: a list of sentences')
  const box = entry.objectBox as Raw | null | undefined
  need(
    box === null ||
      (typeof box === 'object' &&
        box !== undefined &&
        ['x', 'y', 'width', 'height'].every((k) => Number.isSafeInteger(box[k]))),
    'objectBox: { x, y, width, height } in whole pixels, or null',
  )
  return problems
}

/** The manifest, or every problem with it at once. */
export function parseIntakeManifest(
  json: unknown,
): { manifest: IntakeManifest } | { problems: string[] } {
  const raw = (json ?? {}) as Raw
  const problems: string[] = []
  if (!isText(raw.batch) || !KEBAB.test(raw.batch)) problems.push('batch: a kebab-case id')
  if (!isText(raw.receivedAt) || Number.isNaN(Date.parse(raw.receivedAt))) {
    problems.push('receivedAt: an ISO 8601 date and time')
  }
  if (!Array.isArray(raw.entries)) problems.push('entries: a list')
  const entries = Array.isArray(raw.entries) ? (raw.entries as Raw[]) : []
  const seen = new Set<unknown>()
  entries.forEach((entry, i) => {
    problems.push(...entryProblems(entry ?? {}, `entries[${i}]`))
    if (seen.has(entry?.checksum)) problems.push(`entries[${i}].checksum: listed twice`)
    seen.add(entry?.checksum)
  })
  if (problems.length > 0) return { problems }
  return { manifest: raw as unknown as IntakeManifest }
}

export type { IntakeEntry, IntakeManifest }
