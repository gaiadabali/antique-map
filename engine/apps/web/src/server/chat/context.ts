/**
 * Everything a chat request handler needs, in one value: built once per process from the real
 * adapters (`./deps`), or by a test from doubles. A missing secret leaves its part `null`, and
 * the chat answers `unavailable` rather than starting half-configured.
 */
import 'server-only'

import type { ConsentStore } from './consent'
import type { SpendLedger } from './cost'
import type { ChatModels, Env } from './env'
import type { ChatKeys } from './identity'
import type { ChatLimiter } from './limits'
import type { CatalogueReader, ChatModelClient, ChatStore, TurnstileVerifier } from './ports'

export type ChatDeps = {
  readonly env: Env
  readonly now: () => Date
  readonly models: ChatModels
  /** `null` while `ANTHROPIC_API_KEY` is unset. */
  readonly model: ChatModelClient | null
  /** `null` while `TURNSTILE_SECRET` is unset: no session can start. */
  readonly turnstile: TurnstileVerifier | null
  /** `null` while `PAYLOAD_SECRET` is unset. */
  readonly keys: ChatKeys | null
  readonly store: ChatStore
  readonly reader: CatalogueReader
  readonly limiter: ChatLimiter
  readonly consents: ConsentStore
  readonly spend: SpendLedger
  /** The per-process leak canary in the system prompt (AI.md §3.3). */
  readonly canary: string
}
