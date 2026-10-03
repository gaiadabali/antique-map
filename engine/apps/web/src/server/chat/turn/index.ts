/**
 * One visitor turn, once its gate has passed (AI.md §2.1): mask → classify → answer → filter and
 * stream → record. The route has already checked rate limits, the input's length, the kill switch,
 * the caps and Turnstile (`./gates`). Whatever happens here, the turn ends with exactly one `done`
 * event and one transcript record, and its cost reaches the day's ledger.
 */
import 'server-only'

import { siteOrigin } from '@engine/config/sites'
import type Anthropic from '@anthropic-ai/sdk'

import { classify, requiresHandoff } from '../classify'
import type { ChatDeps } from '../context'
import { addUsage, costUsd, emptyUsage, inputTotal } from '../cost'
import { CHAT_LIMITS, wibDay } from '../env'
import { chatCopy, type ChatCopy } from '../lexicon'
import { operatorNote, systemPromptFor } from '../prompt'
import { maskContactDetails } from '../text/mask'
import { rupiahOfLabel } from '../text/money'
import { checkWholeMessage, type CheckContext } from '../text/output-check'
import { defuseVisitorText } from '../text/untrusted'
import { buildHandoffs } from '../tools/handoff'
import type { HandoffTopic } from '../tools/schemas'
import type {
  ChatEvent,
  ChatSessionRecord,
  ChatSettings,
  ClassifierLabel,
  SessionOutcome,
  SiteKey,
  SiteLocale,
  TurnOutcome,
} from '../types'
import { answer } from './answer'
import { overBudget, RECHALLENGE_LABEL, sessionOverCap } from './gates'

export type TurnInput = {
  readonly deps: ChatDeps
  readonly session: ChatSessionRecord
  readonly settings: ChatSettings
  readonly site: SiteKey
  readonly locale: SiteLocale
  /** Cleaned and length-checked by the route. */
  readonly text: string
  /** A public item id parsed from the page the chat was opened on, or `null`. */
  readonly viewingItemId: string | null
  readonly signal: AbortSignal
  readonly emit: (event: ChatEvent) => void
}

const LABEL_TOPICS: Partial<Record<ClassifierLabel, HandoffTopic>> = {
  authenticity_valuation: 'authenticity',
  sell_to_us: 'sell_to_us',
  partnership: 'partnership',
  order_status: 'order',
  price_request: 'price',
  delivery: 'delivery',
}

/** The history the model sees: the stored (masked) transcript as plain turns, append-only. */
export function historyOf(session: ChatSessionRecord): Anthropic.MessageParam[] {
  return session.transcript.map((entry) => ({
    role: entry.role,
    content: entry.role === 'user' ? defuseVisitorText(entry.text) : entry.text,
  }))
}

/** Amounts the shop may state: its settings and every price label tools returned this session. */
function shopAmounts(session: ChatSessionRecord, settings: ChatSettings): Set<number> {
  const amounts = new Set<number>()
  for (const band of settings.delivery?.bands ?? []) amounts.add(band.feeIdr)
  if (settings.delivery?.freeOverIdr) amounts.add(settings.delivery.freeOverIdr)
  for (const label of session.labels) {
    if (label.startsWith('price:')) amounts.add(Number(label.slice(6)))
  }
  return amounts
}

function handoffEvents(input: TurnInput, t: ChatCopy, topic: HandoffTopic): ChatEvent[] {
  return buildHandoffs({
    site: input.site,
    settings: input.settings,
    t,
    topic,
    items: [],
    summary: null,
  }).map((handoff) => ({ type: 'handoff', ...handoff }))
}

export async function runTurn(input: TurnInput): Promise<void> {
  const { deps, session, settings, site, locale, emit } = input
  const t = chatCopy(locale, site)
  const now = deps.now()
  const day = wibDay(now)
  const masked = maskContactDetails(input.text)
  const usage = emptyUsage()
  let cost = 0
  const labels: string[] = []
  const itemIds = new Set<string>()
  const amounts = shopAmounts(session, settings)
  let text = ''
  let outcome: SessionOutcome | null = null
  let done: TurnOutcome = 'answered'

  const say = (line: string) => {
    text += text === '' ? line : `\n\n${line}`
    emit({ type: 'delta', text: line })
  }

  try {
    if (deps.model === null) throw new Error('no model client')
    const classified = await classify(
      deps.model,
      deps.models.classify,
      site,
      masked.text,
      input.signal,
    )
    if (classified.message) {
      const callUsage = emptyUsage()
      addUsage(callUsage, classified.message.usage)
      addUsage(usage, classified.message.usage)
      cost += costUsd(deps.models.classify, callUsage)
    }
    const label = classified.label
    labels.push(`label:${label ?? 'none'}`)
    if (label === 'abuse' || label === 'injection_attempt') labels.push(RECHALLENGE_LABEL)

    if (label === 'abuse') {
      say(t('canned.abuse'))
      handoffEvents(input, t, 'general').forEach(emit)
      outcome = 'refused'
      done = 'refused'
      return
    }

    const handoffRequired = requiresHandoff(label, site)
    const note = operatorNote({
      label,
      handoffRequired,
      viewingItemId: input.viewingItemId,
      leadReference: session.lead,
      maskedContact: masked.email || masked.phone,
    })
    const messages: Anthropic.MessageParam[] = [
      ...historyOf(session),
      { role: 'user', content: defuseVisitorText(masked.text) },
      ...(note ? [{ role: 'system' as const, content: note }] : []),
    ]
    const origin = siteOrigin(site)
    const check: CheckContext = {
      site,
      origins: origin === null ? [] : [origin],
      amounts,
      canary: deps.canary,
    }
    const result = await answer({
      client: deps.model,
      models: deps.models,
      system: systemPromptFor(site, locale, deps.canary),
      messages,
      check,
      signal: input.signal,
      emit,
      tools: {
        site,
        locale,
        t,
        reader: deps.reader,
        settings,
        sessionId: session.id,
        consents: deps.consents,
        itemIds,
        notePrice: (priceLabel) => {
          const rupiah = rupiahOfLabel(priceLabel)
          if (rupiah !== null && !amounts.has(rupiah)) {
            amounts.add(rupiah)
            labels.push(`price:${rupiah}`)
          }
        },
      },
      mayCall: async (turnUsage, turnCost) => {
        const spent = await deps.spend.spent(site, day)
        const projected = {
          ...session,
          usage: {
            inputTokens: session.usage.inputTokens + inputTotal(usage) + inputTotal(turnUsage),
            outputTokens: session.usage.outputTokens + usage.outputTokens + turnUsage.outputTokens,
            costUsd: 0,
          },
        }
        if (overBudget(spent + cost + turnCost, settings)) return 'budget_exhausted'
        return sessionOverCap(projected, settings) ? 'session_limit' : null
      },
    })
    for (const key of Object.keys(usage) as (keyof typeof usage)[]) usage[key] += result.usage[key]
    cost += result.costUsd
    labels.push(...result.labels)
    text = result.text
    let handoffShown = result.handoffShown
    const topic = (label && LABEL_TOPICS[label]) || 'general'

    if (result.ended !== 'answered') {
      const line =
        result.ended === 'blocked'
          ? t(
              site === 'gallery' && result.blockedBy === 'gallery_price'
                ? 'canned.price'
                : 'canned.blocked',
            )
          : result.ended === 'refused'
            ? t('canned.refused')
            : result.ended === 'capped'
              ? t(`error.${result.cappedBy ?? 'session_limit'}`)
              : t('canned.unavailable')
      say(line)
      if (result.blockedBy) labels.push(`blocked:${result.blockedBy}`)
      if (result.ended === 'failed') labels.push('answer_failed')
      if (result.cappedBy) labels.push(`capped:${result.cappedBy}`)
      outcome =
        result.ended === 'blocked' ? 'blocked' : result.ended === 'refused' ? 'refused' : null
      done = result.ended === 'blocked' ? 'blocked' : 'refused'
      if (!handoffShown)
        handoffEvents(input, t, result.blockedBy === 'gallery_price' ? 'price' : topic).forEach(
          emit,
        )
      handoffShown = true
    } else if (handoffRequired && !handoffShown) {
      handoffEvents(input, t, topic).forEach(emit)
      handoffShown = true
    }
    if (outcome === null && handoffShown) {
      outcome = 'handoff'
      if (done === 'answered') done = 'handoff'
    }
    const whole = checkWholeMessage(text, check)
    if (whole) {
      labels.push(`blocked_whole:${whole}`)
      text = t('canned.blocked')
      outcome = 'blocked'
      done = 'blocked'
    }
  } catch (error) {
    if (input.signal.aborted) {
      labels.push('aborted')
      done = 'refused'
    } else {
      console.error(`[chat] turn failed: ${error instanceof Error ? error.name : 'error'}`)
      labels.push('turn_failed')
      say(t('canned.unavailable'))
      handoffEvents(input, t, 'general').forEach(emit)
      done = 'refused'
    }
  } finally {
    await record()
  }

  async function record(): Promise<void> {
    const at = deps.now().toISOString()
    try {
      await deps.spend.add(site, day, cost)
      await deps.store.recordTurn(session.id, {
        entries: [
          { role: 'user', text: masked.text.slice(0, CHAT_LIMITS.maxMessageChars), at },
          { role: 'assistant', text: (text || '…').slice(0, 8000), at },
        ],
        labels: labels.map((label) => label.slice(0, 60)),
        usage: { inputTokens: inputTotal(usage), outputTokens: usage.outputTokens, costUsd: cost },
        outcome,
        at,
        itemIds: [...itemIds],
      })
    } catch (error) {
      console.error(
        `[chat] recording the turn failed: ${error instanceof Error ? error.name : 'error'}`,
      )
    }
    if (!input.signal.aborted) emit({ type: 'done', outcome: done })
  }
}
