/**
 * The intake-manifest import (TASKS.md 8.3.f; CONTENT-MODEL.md §6 "A capture is filed once"): one
 * `masters` record per manifest entry, **keyed by checksum**, so it is idempotent — re-run after a
 * failure, or on a manifest that grew, it creates only what is missing and never a duplicate (the
 * checksum is unique in the table, so even two runs at once make one record).
 *
 * Each entry's file is already in the bucket, at `intakeMasterKey(brand, batch, checksum, ext)`,
 * put there with the origin's credentials when the batch was received. The record's own hook
 * checks it is there and is the file the checksum names; a file copied in without a stored
 * checksum is hashed — the one path allowed to (`context.verifyByHash`, Local API only).
 *
 * It runs on the archive's origin, for a batch of its own captures or its sister outlet's
 * (`./attribution` `importRefusal()`): refused on an outlet, or for a brand it does not keep.
 *
 * It never files a capture under its work (`masterKey()`): that move, with its checksum-verified
 * copy, is TASKS.md 15.4's.
 */
import { intakeMasterKey, type IntakeEntry, type IntakeManifest } from '@engine/media/contract'
import { ValidationError, type Payload } from 'payload'

import { activeBrand } from '../../access/brand'
import { importRefusal, type Brand } from './attribution'

export type ImportOutcome = {
  readonly checksum: string
  readonly storageKey: string
  readonly outcome: 'created' | 'existing' | 'failed'
  readonly id?: number | string
  readonly reason?: string
}

function recordOf(manifest: IntakeManifest, entry: IntakeEntry, storageKey: string) {
  return {
    kind: 'capture' as const,
    storageKey,
    checksum: entry.checksum,
    brand: manifest.brand,
    widthPx: entry.widthPx,
    heightPx: entry.heightPx,
    role: entry.role,
    provenance: entry.provenance,
    ...(entry.objectBox ? { objectBox: { ...entry.objectBox } } : {}),
    objectPpi: entry.objectPpi,
    captureTier: entry.captureTier,
    intake: {
      batch: manifest.batch,
      reference: entry.reference,
      receivedAs: entry.receivedAs,
      verdict: entry.verdict,
      retouching: entry.retouching,
      notes: entry.notes.map((note) => ({ note })),
    },
  }
}

function reasonOf(error: unknown): string {
  if (error instanceof ValidationError) {
    const errors =
      (error.data as { errors?: Array<{ message?: string }> } | undefined)?.errors ?? []
    return errors.map((e) => e.message).join(' ') || error.message
  }
  return error instanceof Error ? error.message : String(error)
}

async function existingId(payload: Payload, checksum: string): Promise<number | string | null> {
  const found = await payload.find({
    collection: 'masters',
    where: { checksum: { equals: checksum } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return found.docs[0]?.id ?? null
}

export async function importIntakeManifest(
  payload: Payload,
  manifest: IntakeManifest,
  brand: Brand | null = activeBrand(),
): Promise<ImportOutcome[]> {
  const refusal = importRefusal(manifest.brand, brand)
  if (refusal) throw new Error(refusal)
  const outcomes: ImportOutcome[] = []
  for (const entry of manifest.entries) {
    const storageKey = intakeMasterKey(
      manifest.brand,
      manifest.batch,
      entry.checksum,
      entry.extension,
    )
    const base = { checksum: entry.checksum, storageKey }
    const before = await existingId(payload, entry.checksum)
    if (before !== null) {
      outcomes.push({ ...base, outcome: 'existing', id: before })
      continue
    }
    try {
      const created = await payload.create({
        collection: 'masters',
        data: recordOf(manifest, entry, storageKey) as never,
        context: { verifyByHash: true },
        overrideAccess: true,
        depth: 0,
      })
      outcomes.push({ ...base, outcome: 'created', id: created.id })
    } catch (error) {
      // A concurrent run that won the unique checksum made the record this one meant to.
      const after = await existingId(payload, entry.checksum)
      outcomes.push(
        after !== null
          ? { ...base, outcome: 'existing', id: after }
          : { ...base, outcome: 'failed', reason: reasonOf(error) },
      )
    }
  }
  return outcomes
}
