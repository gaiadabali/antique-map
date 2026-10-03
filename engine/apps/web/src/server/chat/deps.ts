/**
 * The process's chat dependencies, built on the first request (never at import or at build, which
 * touches no database — CONVENTIONS.md §12): Payload through `@engine/cms/instance`, loaded with
 * `import()`; the Claude API with `ANTHROPIC_API_KEY`; Turnstile with `TURNSTILE_SECRET`; the
 * cookie and address keys from `PAYLOAD_SECRET`. The rate limits, consent tokens and the day's
 * ledger live as long as the process (DEPLOYMENT.md: one process, fork mode).
 */
import 'server-only'

import { randomBytes } from 'node:crypto'

import { ConsentStore } from './consent'
import type { ChatDeps } from './context'
import { SpendLedger } from './cost'
import { chatModels, secretFrom, wibDayStart } from './env'
import { chatKeys } from './identity'
import { ChatLimiter } from './limits'

let built: Promise<ChatDeps> | null = null

async function build(): Promise<ChatDeps> {
  const env = process.env
  const [
    { cms },
    { payloadStore },
    { payloadCatalogue },
    { anthropicClient },
    { turnstileVerifier },
  ] = await Promise.all([
    import('@engine/cms/instance'),
    import('./adapters/payload-store'),
    import('./adapters/payload-catalogue'),
    import('./adapters/anthropic'),
    import('./adapters/turnstile'),
  ])
  const payload = await cms()
  const store = payloadStore(payload)
  const apiKey = secretFrom(env, 'ANTHROPIC_API_KEY')
  const turnstileSecret = secretFrom(env, 'TURNSTILE_SECRET')
  return {
    env,
    now: () => new Date(),
    models: chatModels(env),
    model: apiKey === null ? null : anthropicClient(apiKey),
    turnstile: turnstileSecret === null ? null : turnstileVerifier(turnstileSecret),
    keys: chatKeys(env),
    store,
    reader: payloadCatalogue(payload),
    limiter: new ChatLimiter(),
    consents: new ConsentStore(),
    spend: new SpendLedger((site, day) =>
      store.spentSince(site as 'gallery' | 'shop', wibDayStart(new Date(`${day}T12:00:00+07:00`))),
    ),
    canary: `cnry-${randomBytes(9).toString('base64url')}`,
  }
}

/** The one set of dependencies; a failed first build (no database yet) is retried next time. */
export function chatDeps(): Promise<ChatDeps> {
  if (built === null) {
    built = build().catch((error: unknown) => {
      built = null
      throw error
    })
  }
  return built
}
