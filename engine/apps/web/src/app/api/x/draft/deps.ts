/**
 * The drafting route's dependencies, built on the first request — never at import or at build,
 * which touches no database (CONVENTIONS.md §12): Payload through `@engine/cms/instance`; the
 * Claude API with `ANTHROPIC_API_KEY` (host-only; unset, every run fails as `model_failed`); the
 * model `AI_DRAFT_MODEL`, else the chat's model (`server/chat/env`); the photographs from
 * `MEDIA_PUBLIC_URL`; the limits in this process's memory (DEPLOYMENT.md: fork mode).
 */
import 'server-only'

import type { DraftDeps, DraftModel } from '@engine/cms/ai'

import { chatModels, secretFrom, type Env } from '../../../../server/chat/env'
import { mediaPublicUrl } from '../../../../server/media/public-image'

const MODEL_ID = /^[a-z0-9][a-z0-9.\-_:@]{2,80}$/

/** `AI_DRAFT_MODEL` when it is a model id, else the chat model. */
export function draftModelId(env: Env): string {
  const named = env.AI_DRAFT_MODEL?.trim()
  return named && MODEL_ID.test(named) ? named : chatModels(env).chat
}

const unconfigured: DraftModel = {
  draft: () => Promise.reject(new Error('the drafting model is not configured')),
}

let built: Promise<DraftDeps> | null = null

async function build(): Promise<DraftDeps> {
  const env = process.env
  const [{ cms }, { DraftLimiter }, anthropic, { derivativeImageSource }] = await Promise.all([
    import('@engine/cms/instance'),
    import('@engine/cms/ai'),
    import('./anthropic'),
    import('./images'),
  ])
  const apiKey = secretFrom(env, 'ANTHROPIC_API_KEY')
  return {
    payload: await cms(),
    model:
      apiKey === null
        ? unconfigured
        : anthropic.anthropicDraftModel(anthropic.anthropicMessages(apiKey)),
    images: derivativeImageSource(mediaPublicUrl()),
    modelId: draftModelId(env),
    limiter: new DraftLimiter(),
  }
}

/** The one set of dependencies; a failed first build (no database yet) is retried next time. */
export function draftDeps(): Promise<DraftDeps> {
  if (built === null) {
    const next = build()
    built = next
    next.catch(() => {
      if (built === next) built = null
    })
  }
  return built
}
