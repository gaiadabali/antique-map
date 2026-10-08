/**
 * One visitor turn, once its gate has passed (AI.md §2.1): mask → classify → answer → filter and
 * stream → record. The route has already checked rate limits, the input's length, the kill switch,
 * the caps and Turnstile (`./gates`). Whatever happens here, the turn ends with exactly one `done`
 * event and one transcript record, and its cost reaches the day's ledger.
 */
import 'server-only'

import { siteOrigin } from '@engine/config/sites'
import { formatMoney } from '@engine/i18n'
import type Anthropic from '@anthropic-ai/sdk'

import { classify, requiresHandoff } from '../classify'
import type { ChatDeps } from '../context'
import { addUsage, costUsd, emptyUsage, inputTotal } from '../cost'
import { CHAT_LIMITS, wibDay } from '../env'
import { chatCopy } from '../lexicon'
import { operatorNote, systemPromptFor } from '../prompt'
import { maskContactDetails } from '../text/mask'
import { rupiahOfLabel } from '../text/money'
import { checkWholeMessage, type CheckContext } from '../text/output-check'
import { defuseVisitorText } from '../text/untrusted'
import type {
  ChatEvent,
  ChatSessionRecord,
  ChatSettings,
  SessionOutcome,
  SiteKey,
  SiteLocale,
  TurnOutcome,
} from '../types'
import { answer } from './answer'
import { askedHandoff, replyOffersHandoff } from './asks'
import { overBudget, RECHALLENGE_LABEL, sessionOverCap } from './gates'
import {
  cardItemIds,
  handoffEvents,
  historyOf,
  LABEL_TOPICS,
  leadFormEvent,
  shopAmounts,
  type ServerCardContext,
} from './support'

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

export async function runTurn(input: TurnInput): Promise<void> {
  const { deps, session, settings, site, locale } = input
  const t = chatCopy(locale, site)
  let leadFormShown = false
  const emit = (event: ChatEvent) => {
    if (event.type === 'lead_form') leadFormShown = true
    input.emit(event)
  }
  const now = deps.now()
  const day = wibDay(now)
  const masked = maskContactDetails(input.text)
  const usage = emptyUsage()
  let cost = 0
  const labels: string[] = []
  const itemIds = new Set<string>()
  const amounts = shopAmounts(session, settings)
  const labelOf = new Map<number, string>()
  let text = ''
  let outcome: SessionOutcome | null = null
  let done: TurnOutcome = 'answered'

  const cards = (): ServerCardContext => ({
    deps,
    site,
    locale,
    settings,
    t,
    sessionId: session.id,
    itemIds: cardItemIds(input.viewingItemId, itemIds),
  })

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
      for (const event of await handoffEvents(cards(), 'general')) emit(event)
      outcome = 'refused'
      done = 'refused'
      return
    }

    // The classifier's label or the message's own words: either one guarantees the buttons.
    const asked = askedHandoff(masked.text, site)
    if (asked !== null) labels.push(`asked:${asked}`)
    const handoffRequired = requiresHandoff(label, site) || asked !== null
    const maskedContact = masked.email || masked.phone || masked.address
    const note = operatorNote({
      label,
      handoffRequired,
      viewingItemId: input.viewingItemId,
      leadReference: session.lead,
      maskedContact,
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
      // The exact label a tool returned this turn, else the server's own format for that amount.
      formatRupiah: (rupiah) =>
        labelOf.get(rupiah) ?? formatMoney({ amount: rupiah, currency: 'IDR' }, locale),
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
          if (rupiah !== null) labelOf.set(rupiah, priceLabel)
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
    const topic = (label && LABEL_TOPICS[label]) || asked || 'general'

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
      if (!handoffShown) {
        const blockedTopic = result.blockedBy === 'gallery_price' ? 'price' : topic
        for (const event of await handoffEvents(cards(), blockedTopic)) emit(event)
      }
      handoffShown = true
    } else if (!handoffShown && (handoffRequired || replyOffersHandoff(text))) {
      // Required, or the reply itself offers WhatsApp or email: the buttons must be there.
      for (const event of await handoffEvents(cards(), topic)) emit(event)
      handoffShown = true
    }
    // Typed contact details were masked: the consent form is the only way they reach the team.
    if (maskedContact && !leadFormShown && session.lead === null && result.ended === 'answered') {
      emit(leadFormEvent(cards()))
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
      for (const event of await handoffEvents(cards(), 'general').catch(() => [])) emit(event)
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
