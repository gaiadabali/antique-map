/**
 * What the drafting model may answer (TASKS.md 8.3.a; AI.md §5): one JSON object, exactly this
 * shape, every key present and no other — per field a value, a confidence and the visible basis.
 * The same shape is sent to the API as the structured-output schema (`DRAFT_REPLY_SCHEMA`) and
 * checked here again, strictly, on whatever comes back: an extra key anywhere (a grade, a
 * provenance, a price), a wrong type, an unknown enum value, text that is not JSON — the whole
 * reply is refused and nothing is written. Grade, provenance, stock, status, location and every
 * price are not in the shape, so the model has nowhere to put them (and `./plan` writes only
 * its allow-list, whatever a reply holds).
 */
import { OBJECT_TYPES, type ObjectType } from '../collections/works/vocabulary'
import { DATE_PRECISIONS, type DatePrecision } from '../validators/maker-life-dates'

export const CONFIDENCES = ['low', 'medium', 'high'] as const
export type Confidence = (typeof CONFIDENCES)[number]

type Evidence = { readonly confidence: Confidence; readonly basis: string }
export type DraftSize = { readonly height: number; readonly width: number }

export type DraftReply = {
  readonly title: Evidence & { readonly value: string | null }
  readonly description: Evidence & { readonly en: string | null; readonly id: string | null }
  readonly objectType: Evidence & { readonly value: ObjectType | null }
  readonly date: Evidence & {
    readonly precision: DatePrecision | null
    readonly from: number | null
    readonly to: number | null
  }
  readonly places: Evidence & { readonly names: readonly string[] }
  readonly subjects: Evidence & { readonly names: readonly string[] }
  readonly dimensions: Evidence & {
    readonly scaleVisible: boolean
    readonly image: DraftSize | null
    readonly sheet: DraftSize | null
  }
}

/** Limits the parser holds a reply to (the API schema cannot say them all). */
export const REPLY_LIMITS = {
  title: 240,
  description: 4000,
  basis: 300,
  name: 120,
  names: 6,
  earliestYear: 1000,
  maxMm: 10_000,
  /** The raw reply: anything longer is not a draft of seven fields. */
  replyChars: 20_000,
} as const

type JsonSchema = Record<string, unknown>
const str: JsonSchema = { type: 'string' }
const nullable = (schema: JsonSchema): JsonSchema => ({ anyOf: [schema, { type: 'null' }] })
const object = (properties: Record<string, JsonSchema>): JsonSchema => ({
  type: 'object',
  properties: {
    ...properties,
    confidence: { type: 'string', enum: [...CONFIDENCES] },
    basis: str,
  },
  required: [...Object.keys(properties), 'confidence', 'basis'],
  additionalProperties: false,
})
const size: JsonSchema = {
  type: 'object',
  properties: { height: { type: 'number' }, width: { type: 'number' } },
  required: ['height', 'width'],
  additionalProperties: false,
}

/** The structured-output schema sent with every call. */
export const DRAFT_REPLY_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    title: object({ value: nullable(str) }),
    description: object({ en: nullable(str), id: nullable(str) }),
    objectType: object({ value: nullable({ type: 'string', enum: [...OBJECT_TYPES] }) }),
    date: object({
      precision: nullable({ type: 'string', enum: [...DATE_PRECISIONS] }),
      from: nullable({ type: 'integer' }),
      to: nullable({ type: 'integer' }),
    }),
    places: object({ names: { type: 'array', items: str } }),
    subjects: object({ names: { type: 'array', items: str } }),
    dimensions: object({
      scaleVisible: { type: 'boolean' },
      image: nullable(size),
      sheet: nullable(size),
    }),
  },
  required: ['title', 'description', 'objectType', 'date', 'places', 'subjects', 'dimensions'],
  additionalProperties: false,
}

export type ParsedReply = { ok: true; reply: DraftReply } | { ok: false; reason: string }

class Refused extends Error {}

const fail = (reason: string): never => {
  throw new Refused(reason)
}

type Obj = Record<string, unknown>

function exactly(value: unknown, keys: readonly string[], at: string): Obj {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(`${at}: not an object`)
  const own = Object.keys(value as Obj)
  const extra = own.filter((key) => !keys.includes(key))
  if (extra.length > 0) fail(`${at}: unexpected ${extra.join(', ')}`)
  const missing = keys.filter((key) => !own.includes(key))
  if (missing.length > 0) fail(`${at}: missing ${missing.join(', ')}`)
  return value as Obj
}

function text(value: unknown, max: number, at: string, nullable = true): string | null {
  if (value === null && nullable) return null
  if (typeof value !== 'string') return fail(`${at}: not text`)
  const trimmed = value.trim()
  if (trimmed.length > max) fail(`${at}: longer than ${max}`)
  return trimmed === '' ? null : trimmed
}

function oneOf<T extends string>(value: unknown, options: readonly T[], at: string): T | null {
  if (value === null) return null
  if (typeof value !== 'string' || !(options as readonly string[]).includes(value)) {
    return fail(`${at}: not one of the options`)
  }
  return value as T
}

function year(value: unknown, at: string): number | null {
  if (value === null) return null
  const latest = new Date().getUTCFullYear()
  if (!Number.isInteger(value) || (value as number) < REPLY_LIMITS.earliestYear) {
    return fail(`${at}: not a year`)
  }
  if ((value as number) > latest) fail(`${at}: in the future`)
  return value as number
}

function mm(value: unknown, at: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) fail(`${at}: not a size`)
  if ((value as number) > REPLY_LIMITS.maxMm) fail(`${at}: too large`)
  return value as number
}

function sizeOf(value: unknown, at: string): DraftSize | null {
  if (value === null) return null
  const o = exactly(value, ['height', 'width'], at)
  return { height: mm(o.height, `${at}.height`), width: mm(o.width, `${at}.width`) }
}

/** Each entry must be text; a blank one says nothing and is dropped (never kept as a null). */
function names(value: unknown, at: string): string[] {
  if (!Array.isArray(value)) return fail(`${at}: not a list`)
  if (value.length > REPLY_LIMITS.names) fail(`${at}: more than ${REPLY_LIMITS.names}`)
  return value
    .map((name, index) => text(name, REPLY_LIMITS.name, `${at}.${index}`, false))
    .filter((name): name is string => name !== null)
}

function evidence(o: Obj, at: string): Evidence {
  const confidence = oneOf(o.confidence, CONFIDENCES, `${at}.confidence`)
  if (confidence === null) fail(`${at}.confidence: missing`)
  const basis = text(o.basis, REPLY_LIMITS.basis, `${at}.basis`, false) ?? ''
  return { confidence: confidence as Confidence, basis }
}

function check(value: unknown): DraftReply {
  const root = exactly(
    value,
    ['title', 'description', 'objectType', 'date', 'places', 'subjects', 'dimensions'],
    'reply',
  )
  const field = (name: string, keys: readonly string[]) =>
    exactly(root[name], [...keys, 'confidence', 'basis'], name)
  const title = field('title', ['value'])
  const description = field('description', ['en', 'id'])
  const objectType = field('objectType', ['value'])
  const date = field('date', ['precision', 'from', 'to'])
  const places = field('places', ['names'])
  const subjects = field('subjects', ['names'])
  const dimensions = field('dimensions', ['scaleVisible', 'image', 'sheet'])
  if (typeof dimensions.scaleVisible !== 'boolean') fail('dimensions.scaleVisible: not true/false')
  return {
    title: { ...evidence(title, 'title'), value: text(title.value, REPLY_LIMITS.title, 'title') },
    description: {
      ...evidence(description, 'description'),
      en: text(description.en, REPLY_LIMITS.description, 'description.en'),
      id: text(description.id, REPLY_LIMITS.description, 'description.id'),
    },
    objectType: {
      ...evidence(objectType, 'objectType'),
      value: oneOf(objectType.value, OBJECT_TYPES, 'objectType.value'),
    },
    date: {
      ...evidence(date, 'date'),
      precision: oneOf(date.precision, DATE_PRECISIONS, 'date.precision'),
      from: year(date.from, 'date.from'),
      to: year(date.to, 'date.to'),
    },
    places: { ...evidence(places, 'places'), names: names(places.names, 'places.names') },
    subjects: { ...evidence(subjects, 'subjects'), names: names(subjects.names, 'subjects.names') },
    dimensions: {
      ...evidence(dimensions, 'dimensions'),
      scaleVisible: dimensions.scaleVisible as boolean,
      image: sizeOf(dimensions.image, 'dimensions.image'),
      sheet: sizeOf(dimensions.sheet, 'dimensions.sheet'),
    },
  }
}

/** The model's text as a draft, or why it is refused. Never throws. */
export function parseDraftReply(raw: string): ParsedReply {
  if (raw.length > REPLY_LIMITS.replyChars) return { ok: false, reason: 'reply: too long' }
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return { ok: false, reason: 'reply: not JSON' }
  }
  try {
    return { ok: true, reply: check(value) }
  } catch (error) {
    if (error instanceof Refused) return { ok: false, reason: error.message }
    throw error
  }
}
