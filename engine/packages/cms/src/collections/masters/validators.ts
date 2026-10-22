/**
 * What makes a `masters` record consistent with itself, on every save (CONTENT-MODEL.md §6, §9;
 * C9 v1.4; TASKS.md 8.3.f). Pure: the record in, each problem out with the field it belongs to.
 *
 * - The storage key is the one C9 builds for the file: under the kind's prefix, ending in the
 *   file's own checksum — so a key can never name a file other than the one the record vouches
 *   for, nor climb out of its prefix.
 * - A capture says what the intake measured: its role and provenance at least.
 * - The object's box lies inside the frame (C9 `boxFits()`), in whole pixels.
 * - An intake key's batch is the record's own.
 */
import { boxFits, INTAKE_MASTERS_PREFIX } from '@engine/media/contract'
import { isSha256Hex, kindPrefix, masterContentType, type MasterKind } from '@engine/media/storage'

export type FieldProblem = { readonly path: string; readonly message: string }

type Box = { x?: unknown; y?: unknown; width?: unknown; height?: unknown }
export type MasterInput = {
  readonly kind?: unknown
  readonly storageKey?: unknown
  readonly checksum?: unknown
  readonly widthPx?: unknown
  readonly heightPx?: unknown
  readonly role?: unknown
  readonly provenance?: unknown
  readonly objectBox?: Box | null
  readonly objectPpi?: unknown
  readonly intake?: { readonly batch?: unknown } | null
}

const isSet = (value: unknown) => value !== undefined && value !== null && value !== ''
const isWhole = (value: unknown, min: number) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min

/** `masters/intake/<batch>/<file>` → its batch; null for any other key. */
export function intakeSegments(key: string): { batch: string } | null {
  if (!key.startsWith(INTAKE_MASTERS_PREFIX)) return null
  const [batch, file, ...rest] = key.slice(INTAKE_MASTERS_PREFIX.length).split('/')
  return batch && file && rest.length === 0 ? { batch } : null
}

function keyProblems(kind: MasterKind, key: string, checksum: string): FieldProblem[] {
  const at = (message: string) => [{ path: 'storageKey', message }]
  const segments = key.split('/')
  if (key.startsWith('/') || segments.some((segment) => segment === '' || segment === '..')) {
    return at(
      'A storage key is a path inside the bucket: no leading "/", no empty or ".." segment.',
    )
  }
  if (!key.startsWith(kindPrefix(kind))) {
    return at(`A ${kind} is stored under ${kindPrefix(kind)}, not at "${key}".`)
  }
  const file = segments.at(-1)!
  const dot = file.lastIndexOf('.')
  const extension = dot === -1 ? '' : file.slice(dot + 1)
  if (file.slice(0, dot) !== checksum) {
    return at('The file name in the storage key is its checksum: this key names another file.')
  }
  if (masterContentType(kind, extension) === null) {
    return at(`A ${kind} cannot be a .${extension || '(no extension)'} file.`)
  }
  return []
}

function boxProblems(input: MasterInput): FieldProblem[] {
  const box = input.objectBox ?? {}
  const parts = [box.x, box.y, box.width, box.height]
  if (parts.every((part) => !isSet(part))) return []
  const at = (message: string) => [{ path: 'objectBox', message }]
  if (!parts.every((part) => isWhole(part, 0))) {
    return at("The object's box is four whole numbers of pixels: x, y, width and height.")
  }
  if (!isWhole(input.widthPx, 1) || !isWhole(input.heightPx, 1)) {
    return at("Record the frame's width and height in pixels before the object's box inside it.")
  }
  const fits = boxFits(
    {
      x: box.x as number,
      y: box.y as number,
      width: box.width as number,
      height: box.height as number,
    },
    input.widthPx as number,
    input.heightPx as number,
  )
  return fits
    ? []
    : at(
        `The object's box must lie inside the ${String(input.widthPx)} × ${String(input.heightPx)} px frame.`,
      )
}

export function masterProblems(input: MasterInput): FieldProblem[] {
  const problems: FieldProblem[] = []
  const kind = input.kind === 'capture' ? input.kind : null
  if (!kind) problems.push({ path: 'kind', message: 'A master is a capture.' })
  const checksum = isSha256Hex(input.checksum) ? input.checksum : null
  if (!checksum) {
    problems.push({ path: 'checksum', message: "The file's SHA-256, as 64 lower-case hex digits." })
  }
  if (typeof input.storageKey !== 'string' || input.storageKey.length === 0) {
    problems.push({ path: 'storageKey', message: 'Where the file is in the masters bucket.' })
  } else if (kind && checksum) {
    problems.push(...keyProblems(kind, input.storageKey, checksum))
  }
  for (const field of ['widthPx', 'heightPx', 'objectPpi'] as const) {
    if (isSet(input[field]) && !isWhole(input[field], 1)) {
      problems.push({ path: field, message: 'A whole number above zero.' })
    }
  }
  if (kind === 'capture') {
    for (const field of ['role', 'provenance'] as const) {
      if (!isSet(input[field])) {
        problems.push({
          path: field,
          message: `A capture records its ${field}, as the intake judged it.`,
        })
      }
    }
  }
  problems.push(...boxProblems(input))
  const intake = typeof input.storageKey === 'string' ? intakeSegments(input.storageKey) : null
  if (intake) {
    if (input.intake?.batch !== intake.batch) {
      problems.push({
        path: 'intake.batch',
        message: `This intake key is in batch "${intake.batch}".`,
      })
    }
  }
  return problems
}
