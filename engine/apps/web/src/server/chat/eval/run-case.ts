/**
 * Drives one golden-set case through the real server turn (AI.md §6, ticket 8.4b): `turn/runTurn`
 * itself, the 8.1 tools, over the case's own fixtures via `./fixtures` and the mocked-run store
 * (`../test-support/memory`) — never a re-implementation of the pipeline. One session per case;
 * each of the case's turns runs in order against the same session, as a real conversation would.
 */
import 'server-only'

import { ConsentStore } from '../consent'
import type { ChatDeps } from '../context'
import { SpendLedger } from '../cost'
import { chatModels, type ChatModels } from '../env'
import { ChatLimiter } from '../limits'
import { MemoryStore } from '../test-support/memory'
import type { ChatModelClient } from '../ports'
import { runTurn } from '../turn'
import type { ChatEvent, ChatSessionRecord } from '../types'
import { EvalReader } from './fixtures'
import type { EvalCase } from './schema'

export type CaseRunOk = {
  readonly ok: true
  readonly session: ChatSessionRecord
  readonly turnEvents: readonly (readonly ChatEvent[])[]
  readonly idOfFixture: ReadonlyMap<string, string>
}
export type CaseRunFail = { readonly ok: false; readonly reason: string }
export type CaseRunOutcome = CaseRunOk | CaseRunFail

/**
 * A case whose fixtures hold exactly one item is an item-page question ("describe this work"): the
 * real widget passes that page's item id as `viewingItemId`, so the runner does the same. Cases
 * with several (or no) items open the chat from no particular page.
 */
export function viewingItemOf(
  evalCase: EvalCase,
  idOfFixture: ReadonlyMap<string, string>,
): string | null {
  const items = [...(evalCase.fixtures?.works ?? []), ...(evalCase.fixtures?.products ?? [])]
  const only = items.length === 1 ? items[0] : undefined
  return only ? (idOfFixture.get(only.id) ?? null) : null
}

const CLOCK = Date.parse('2026-10-07T03:00:00.000Z')
export const EVAL_CANARY = 'cnry-EVALCANARY'

export async function runCase(
  evalCase: EvalCase,
  model: ChatModelClient,
  beforeTurn?: () => void,
  models: ChatModels = chatModels({}),
): Promise<CaseRunOutcome> {
  const reader = new EvalReader(evalCase.fixtures)
  const store = new MemoryStore()
  const deps: ChatDeps = {
    env: {},
    now: () => new Date(CLOCK),
    models,
    model,
    turnstile: null,
    keys: null,
    store,
    reader,
    limiter: new ChatLimiter(),
    consents: new ConsentStore(() => CLOCK),
    spend: new SpendLedger(async () => 0),
    canary: EVAL_CANARY,
  }
  const settings = await store.settings(evalCase.site)
  if (settings === null) return { ok: false, reason: `no settings for site ${evalCase.site}` }

  let session = await store.createSession({
    site: evalCase.site,
    locale: evalCase.locale,
    startedAt: new Date(CLOCK).toISOString(),
    ipHash: 'eval',
    labels: [],
  })

  const turnEvents: ChatEvent[][] = []
  try {
    for (const turn of evalCase.turns) {
      beforeTurn?.()
      const events: ChatEvent[] = []
      await runTurn({
        deps,
        session,
        settings,
        site: evalCase.site,
        locale: evalCase.locale,
        text: turn.text,
        viewingItemId: viewingItemOf(evalCase, reader.idOfFixture),
        signal: new AbortController().signal,
        emit: (event) => events.push(event),
      })
      turnEvents.push(events)
      session = (await store.getSession(session.id)) ?? session
    }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'unknown error' }
  }

  return { ok: true, session, turnEvents, idOfFixture: reader.idOfFixture }
}
