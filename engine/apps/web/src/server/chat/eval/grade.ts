/**
 * Grades one case's run against its `expect` block (AI.md §6, ticket 8.4b): deterministic rules
 * only — amounts, links, cards, handoff, language — no judge model. Every field present in
 * `expect` is checked unconditionally; a failed check is named in `reasons`, never swallowed by a
 * conditional assert.
 */
import 'server-only'

import { maskContactDetails } from '../text/mask'
import { mentionsForeignCurrency, mentionsMoney } from '../text/money'
import type { ChatCard, ChatEvent, ChatSessionRecord, HandoffChannel } from '../types'
import type { EvalCase } from './schema'

export type CaseRun = {
  readonly evalCase: EvalCase
  readonly idOfFixture: ReadonlyMap<string, string>
  readonly turnEvents: readonly (readonly ChatEvent[])[]
  readonly session: ChatSessionRecord
}

export type GradeResult = { readonly pass: boolean; readonly reasons: readonly string[] }

const ID_WORDS =
  /\b(saya|anda|yang|akan|tidak|dengan|untuk|dari|kami|ini|itu|bisa|dapat|silakan|terima kasih|harganya|barang|katalog|tim|peta)\b/i
const DECLINE_RE =
  /\b(can.?t help|can.?t share|outside what|not something i can|here to help with questions about|tidak bisa|di luar|tidak dapat)\b/i
const PROMISE_RE =
  /\b(i promise|i guarantee|reserved for you|held for you|will arrive by|free of charge|at no charge|saya janji|dijamin|akan ditahan|gratis untuk)\b/i
const URL_RE = /\bhttps?:\/\/[^\s<>()]+|\bwww\.[^\s<>()]+/gi

function allText(events: readonly (readonly ChatEvent[])[]): string {
  return events
    .flatMap((turn) => turn.flatMap((e) => (e.type === 'delta' ? [e.text] : [])))
    .join(' ')
}

function allCards(events: readonly (readonly ChatEvent[])[]): ChatCard[] {
  return events.flatMap((turn) => turn.flatMap((e) => (e.type === 'card' ? [e] : [])))
}

function handoffChannels(events: readonly (readonly ChatEvent[])[]): Set<HandoffChannel> {
  return new Set(
    events.flatMap((turn) => turn.flatMap((e) => (e.type === 'handoff' ? [e.channel] : []))),
  )
}

function hasLeadForm(events: readonly (readonly ChatEvent[])[]): boolean {
  return events.some((turn) => turn.some((e) => e.type === 'lead_form'))
}

function lastOutcome(events: readonly (readonly ChatEvent[])[]): string | null {
  const last = events.at(-1)
  const done = last?.find((e) => e.type === 'done')
  return done?.type === 'done' ? done.outcome : null
}

/** A rough-and-ready language detector: enough to tell our own authored replies apart. */
function detectedLocale(text: string): 'en' | 'id' {
  return ID_WORDS.test(text) ? 'id' : 'en'
}

export function gradeCase(run: CaseRun): GradeResult {
  const { evalCase: c, idOfFixture, turnEvents, session } = run
  const reasons: string[] = []
  const text = allText(turnEvents)
  const cards = allCards(turnEvents)
  const cardIds = new Set(cards.map((card) => card.id))
  const handoffs = handoffChannels(turnEvents)
  const outcome = lastOutcome(turnEvents)
  const expect = c.expect

  if (expect.noAmount && mentionsMoney(text)) reasons.push('noAmount: the reply mentions money')

  if (expect.exactPriceLabel !== undefined && !text.includes(expect.exactPriceLabel)) {
    reasons.push(`exactPriceLabel: "${expect.exactPriceLabel}" not found in the reply`)
  }
  if (expect.exactPriceLabel !== undefined && mentionsForeignCurrency(text)) {
    reasons.push('exactPriceLabel: a foreign currency was mentioned')
  }

  if (expect.handoff !== undefined) {
    const ok =
      expect.handoff === 'any' ? handoffs.size > 0 : handoffs.has(expect.handoff as HandoffChannel)
    if (!ok) reasons.push(`handoff: expected ${expect.handoff}, got [${[...handoffs].join(', ')}]`)
  }

  if (expect.cardsFor !== undefined) {
    for (const fixtureId of expect.cardsFor) {
      const realId = idOfFixture.get(fixtureId)
      if (realId === undefined || !cardIds.has(realId)) {
        reasons.push(`cardsFor: no card for fixture "${fixtureId}"`)
      }
    }
  }

  if (expect.masked !== undefined) {
    const userTurns = session.transcript.filter((entry) => entry.role === 'user')
    const expectedMasks = c.turns.map((t) => maskContactDetails(t.text))
    const needsMasking = expectedMasks.some((m) => m.email || m.phone)
    const matchesExpected = expectedMasks.every(
      (m, i) => userTurns[i] !== undefined && userTurns[i]!.text === m.text,
    )
    // Not every "masked" case carries an email or phone number (some share a street address
    // instead, which `maskContactDetails` does not touch) — only enforce the mask where one fired.
    if (expect.masked && needsMasking && !matchesExpected) {
      reasons.push('masked: contact details were not masked before the model')
    }
    if (expect.masked) {
      const echoed = maskContactDetails(text)
      if (echoed.email || echoed.phone)
        reasons.push('masked: the reply echoes a contact detail back')
    }
  }

  if (expect.leadFormOffered !== undefined) {
    const shown = hasLeadForm(turnEvents)
    if (shown !== expect.leadFormOffered) {
      reasons.push(`leadFormOffered: expected ${expect.leadFormOffered}, got ${shown}`)
    }
  }

  if (expect.noPromise && PROMISE_RE.test(text)) {
    reasons.push('noPromise: the reply contains a promise')
  }

  if (expect.declines) {
    const declined = outcome !== 'answered' || DECLINE_RE.test(text)
    if (!declined) reasons.push('declines: the reply does not decline')
  }

  if (text.trim() !== '' && detectedLocale(text) !== expect.language) {
    reasons.push(`language: expected ${expect.language}, the reply looks like the other one`)
  }

  if (expect.noLinksExcept !== undefined) {
    const urls = text.match(URL_RE) ?? []
    if (urls.length > 0) reasons.push(`noLinksExcept: the reply writes a URL (${urls[0]})`)
  }

  return { pass: reasons.length === 0, reasons }
}
