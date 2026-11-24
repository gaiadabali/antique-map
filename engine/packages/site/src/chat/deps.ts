/**
 * An app's dependencies for `@engine/chat`, built on the first request (never at import or at
 * build, which touches no database — CONVENTIONS.md §12): the chat configuration of each site the
 * app serves (`sites`); the store and catalogue reader on Payload through `@engine/cms/instance` —
 * today's app's one CMS, the shop app's own (its `turbopack.resolveAlias`) — loaded with
 * `import()`; the Claude API with `ANTHROPIC_API_KEY`; Turnstile with `TURNSTILE_SECRET`; the
 * cookie and address keys from `PAYLOAD_SECRET`. The rate limits, consent tokens and the day's
 * ledger live as long as the process (DEPLOYMENT.md: one process, fork mode).
 *
 * Moved from today's app (TASKS.md 23.4). Whether the CMS's records carry `site` is read from its
 * config (`@engine/cms-shop/site`): one that holds a single site's records (the shop's own) is
 * read and written without the field, and serves exactly one site's chat.
 */
import 'server-only'

import { randomBytes } from 'node:crypto'

import { ConsentStore } from '@engine/chat/server/consent'
import type { ChatDeps } from '@engine/chat/server/context'
import { SpendLedger } from '@engine/chat/server/cost'
import { chatModels, modelBaseUrl, secretFrom, wibDayStart } from '@engine/chat/server/env'
import { chatKeys } from '@engine/chat/server/identity'
import { ChatLimiter } from '@engine/chat/server/limits'
import type { ChatSites } from '@engine/chat/server/sites'
import type { SiteKey } from '@engine/config/sites'

/** The one site a CMS without a `site` field serves, or `undefined` when its records carry one. */
export function onlySiteOf(sited: boolean, sites: ChatSites): SiteKey | undefined {
  if (sited) return undefined
  const served = Object.keys(sites) as SiteKey[]
  if (served.length !== 1) {
    throw new Error('a CMS whose records carry no site serves exactly one site’s chat')
  }
  return served[0]
}

async function build(sites: ChatSites): Promise<ChatDeps> {
  const env = process.env
  const [
    { cms },
    { recordsCarrySite },
    { payloadStore },
    { payloadCatalogue },
    { anthropicClient },
    { turnstileVerifier },
  ] = await Promise.all([
    import('@engine/cms/instance'),
    import('@engine/cms-shop/site'),
    import('./store'),
    import('./catalogue'),
    import('@engine/chat/server/anthropic'),
    import('../leads/turnstile'),
  ])
  const payload = await cms()
  const only = onlySiteOf(recordsCarrySite(payload, 'chat-sessions'), sites)
  const store = payloadStore(payload, { only })
  const apiKey = secretFrom(env, 'ANTHROPIC_API_KEY')
  const turnstileSecret = secretFrom(env, 'TURNSTILE_SECRET')
  return {
    env,
    sites,
    now: () => new Date(),
    models: chatModels(env),
    model: apiKey === null ? null : anthropicClient(apiKey, modelBaseUrl(env)),
    turnstile: turnstileSecret === null ? null : turnstileVerifier(turnstileSecret),
    keys: chatKeys(env),
    store,
    reader: payloadCatalogue(payload, { only }),
    limiter: new ChatLimiter(),
    consents: new ConsentStore(),
    spend: new SpendLedger((site, day) =>
      store.spentSince(site as SiteKey, wibDayStart(new Date(`${day}T12:00:00+07:00`))),
    ),
    canary: `cnry-${randomBytes(9).toString('base64url')}`,
  }
}

/**
 * The process's one set of dependencies for `sites`, as a lazy getter: built on its first call; a
 * failed first build (no database yet) is retried on the next.
 */
export function siteChatDeps(sites: ChatSites): () => Promise<ChatDeps> {
  let built: Promise<ChatDeps> | null = null
  return () => {
    if (built === null) {
      built = build(sites).catch((error: unknown) => {
        built = null
        throw error
      })
    }
    return built
  }
}
