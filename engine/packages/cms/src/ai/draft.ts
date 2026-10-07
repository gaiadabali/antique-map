/**
 * One drafting run on a work (TASKS.md 8.3.a–b; AI.md §5): the owner or an editor asks, the
 * server sends up to 6 of the work's photographs to the vision model with the fixed prompt, checks
 * the reply strictly, matches its places and subjects to existing rows, and fills the work's empty
 * allow-listed fields as a **draft version** — a published page never shows unverified text —
 * each marked drafted and unverified, with the run recorded (who, when, the model, the prompt
 * version, the images, the usage, the checked output).
 *
 * Refused, writing nothing: anyone but the owner or an editor (from the session, never the body);
 * drafting switched off (`site-settings` `gallery.ai.draftingEnabled`, fail closed); a work with no
 * photograph; a second run on the same work; a user's 21st run in an hour; a model refusal; a
 * reply that is not exactly the schema.
 */
import { ValidationError, type Payload } from 'payload'

import { isCatalogueStaff, type RequestUser } from '../access/roles'
import type { AiDraftableField } from '../collections/works/vocabulary'
import type { DraftLimiter } from './limits'
import { planDraft, type CurrentWork, type DraftPlan } from './plan'
import type { DraftImage, DraftImageSource, DraftMediaFacts, DraftModel, DraftUsage } from './ports'
import { DRAFT_PROMPT_VERSION, DRAFT_SYSTEM_PROMPT, draftUserText } from './prompt'
import { DRAFT_REPLY_SCHEMA, parseDraftReply } from './reply'
import { matchVocabulary } from './vocabulary'

/** At most this many photographs go to the model (AI.md §5). */
export const DRAFT_MAX_IMAGES = 6
const MAX_OUTPUT_TOKENS = 4096

export type DraftDeps = {
  readonly payload: Payload
  readonly model: DraftModel
  readonly images: DraftImageSource
  /** `AI_DRAFT_MODEL`, else the chat model: config, never code. */
  readonly modelId: string
  readonly limiter: DraftLimiter
  readonly now?: () => Date
  /** Runs the write; a caller outside a request passes an invalidation batch (`@engine/cache`). */
  readonly withWrites?: <T>(run: (context: Record<string, unknown>) => Promise<T>) => Promise<T>
}

export type DraftRefusal =
  | 'not_signed_in'
  | 'not_allowed'
  | 'disabled'
  | 'not_found'
  | 'no_photographs'
  | 'busy'
  | 'rate_limited'
  | 'model_refused'
  | 'unusable_reply'
  | 'model_failed'
  | 'not_saved'

export type DraftResult =
  | ({ readonly ok: true } & Pick<DraftPlan, 'filled' | 'skipped' | 'suggestions'>)
  | { readonly ok: false; readonly code: DraftRefusal; readonly retryAfter?: number }

type Doc = Record<string, unknown>
type Id = number | string

const obj = (value: unknown): Doc =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Doc) : {}
const idOf = (value: unknown): Id | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  const id = obj(value).id
  return typeof id === 'number' || typeof id === 'string' ? id : null
}
const refuse = (code: DraftRefusal, retryAfter?: number): DraftResult =>
  retryAfter === undefined ? { ok: false, code } : { ok: false, code, retryAfter }

/** The kill switch, read on every run; anything but an explicit `true` is off. */
async function draftingEnabled(payload: Payload): Promise<boolean> {
  const settings = await payload.findGlobal({
    slug: 'site-settings',
    depth: 0,
    select: { gallery: { ai: { draftingEnabled: true } } },
  } as Parameters<Payload['findGlobal']>[0])
  return obj(obj(obj(settings).gallery).ai).draftingEnabled === true
}

function currentOf(work: Doc): CurrentWork {
  return {
    title: typeof work.title === 'string' ? work.title : null,
    objectType: typeof work.objectType === 'string' ? work.objectType : null,
    date: work.date ? obj(work.date) : null,
    places: Array.isArray(work.places) ? work.places : [],
    subjects: Array.isArray(work.subjects) ? work.subjects : [],
    dimensions: work.dimensions ? obj(work.dimensions) : null,
  }
}

/** The work's photographs (provenance `photograph`, never a synthetic image), in row order. */
async function photographsOf(payload: Payload, user: unknown, work: Doc) {
  const ids = (Array.isArray(work.images) ? work.images : [])
    .map((row) => idOf(obj(row).media))
    .filter((id): id is Id => id !== null)
  if (ids.length === 0) return []
  const { docs } = await payload.find({
    collection: 'media',
    where: { id: { in: ids } },
    overrideAccess: false,
    user,
    depth: 0,
    limit: ids.length,
    pagination: false,
    select: {
      provenance: true,
      assetId: true,
      width: true,
      height: true,
      derivatives: { status: true },
    },
  } as Parameters<Payload['find']>[0])
  const byId = new Map((docs as Doc[]).map((doc) => [String(doc.id), doc]))
  return ids
    .map((id) => byId.get(String(id)))
    .filter((doc): doc is Doc => doc !== undefined && doc.provenance === 'photograph')
    .map(
      (doc): DraftMediaFacts => ({
        id: doc.id as Id,
        assetId: typeof doc.assetId === 'string' ? doc.assetId : null,
        width: typeof doc.width === 'number' ? doc.width : null,
        height: typeof doc.height === 'number' ? doc.height : null,
        derivativesReady: obj(doc.derivatives).status === 'ready',
      }),
    )
}

async function loadImages(source: DraftImageSource, facts: readonly DraftMediaFacts[]) {
  const loaded: DraftImage[] = []
  for (const media of facts) {
    if (loaded.length >= DRAFT_MAX_IMAGES) break
    const image = await source.load(media)
    if (image) loaded.push(image)
  }
  return loaded
}

type Run = { reply: ReturnType<typeof parseDraftReply>; usage: DraftUsage } | DraftRefusal

async function callModel(deps: DraftDeps, images: readonly DraftImage[]): Promise<Run> {
  try {
    const answer = await deps.model.draft({
      model: deps.modelId,
      system: DRAFT_SYSTEM_PROMPT,
      text: draftUserText(images.length),
      images,
      schema: DRAFT_REPLY_SCHEMA,
      maxTokens: MAX_OUTPUT_TOKENS,
    })
    if (answer.kind === 'refusal') return 'model_refused'
    return { reply: parseDraftReply(answer.text), usage: answer.usage }
  } catch {
    return 'model_failed'
  }
}

function unverified(fields: readonly AiDraftableField[]): Doc {
  return Object.fromEntries(
    fields.map((field) => [
      field,
      { drafted: true, verified: false, verifiedBy: null, verifiedAt: null },
    ]),
  )
}

export async function draftWork(
  deps: DraftDeps,
  input: { readonly user: RequestUser; readonly workId: Id },
): Promise<DraftResult> {
  const { payload, limiter } = deps
  const user = input.user
  if (!user) return refuse('not_signed_in')
  if (!isCatalogueStaff(user)) return refuse('not_allowed')
  if (!(await draftingEnabled(payload))) return refuse('disabled')
  const work = (await payload
    .findByID({
      collection: 'works',
      id: input.workId,
      draft: true,
      depth: 0,
      locale: 'en',
      overrideAccess: false,
      user,
    } as Parameters<Payload['findByID']>[0])
    .catch(() => null)) as Doc | null
  if (!work) return refuse('not_found')
  const photographs = await photographsOf(payload, user, work)
  if (photographs.length === 0) return refuse('no_photographs')
  const key = String(work.id)
  if (!limiter.begin(key)) return refuse('busy')
  try {
    const images = await loadImages(deps.images, photographs)
    if (images.length === 0) return refuse('no_photographs')
    const now = deps.now?.() ?? new Date()
    const wait = limiter.take(String(idOf(user)), now.getTime())
    if (wait > 0) return refuse('rate_limited', wait)
    const run = await callModel(deps, images)
    if (typeof run === 'string') return refuse(run)
    if (!run.reply.ok) return refuse('unusable_reply')
    const reply = run.reply.reply
    const matches = await matchVocabulary(payload, user, reply.places.names, reply.subjects.names)
    const plan = planDraft(reply, currentOf(work), matches)
    const record = {
      model: deps.modelId,
      promptVersion: DRAFT_PROMPT_VERSION,
      imageIds: images.map((image) => image.mediaId),
      usage: run.usage,
      output: reply,
      filled: plan.filled,
      skipped: plan.skipped,
    }
    const write = deps.withWrites ?? ((go) => go({}))
    try {
      await write((context) =>
        payload.update({
          collection: 'works',
          id: work.id as Id,
          draft: true,
          locale: 'en',
          overrideAccess: false,
          user,
          context,
          data: {
            ...plan.patch,
            cataloguing: {
              aiDraft: unverified(plan.filled),
              aiDraftRun: { requestedBy: idOf(user), requestedAt: now.toISOString(), record },
            },
          },
        } as Parameters<Payload['update']>[0]),
      )
    } catch (error) {
      if (error instanceof ValidationError) return refuse('not_saved')
      throw error
    }
    return { ok: true, filled: plan.filled, skipped: plan.skipped, suggestions: plan.suggestions }
  } finally {
    limiter.end(key)
  }
}
