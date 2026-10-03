/**
 * The chat's records behind `ChatStore`, through Payload's Local API. `chat-sessions`, `leads` and
 * `site-settings` are owner-only collections no visitor reads (CONTENT-MODEL.md §7): the chat is
 * the server writing them, so these calls pass `overrideAccess: true`, each with a `select` of
 * exactly the fields it needs. Leads are created here only — after the visitor's consent click
 * (`../http/consent`) — never by a public REST write.
 *
 * A session's `expiresAt` is set by the collection's own hook from `lastMessageAt` (30 days,
 * AI.md §3.4); every turn moves `lastMessageAt`, so the retention runs from the last message.
 */
import 'server-only'

import type { Payload } from '@engine/cms/instance'

import type { ChatStore, NewLead } from '../ports'
import type { SessionOutcome, TranscriptEntry } from '../types'
import { mapSession, mapSettings, settingsSelect } from './payload-maps'

type Loose = (args: Record<string, unknown>) => Promise<unknown>
type Docs = { docs: unknown[]; hasNextPage?: boolean }

const idOf = (id: string): string | number => (/^\d+$/.test(id) ? Number(id) : id)
const DAY_MS = 24 * 60 * 60 * 1000
const OPEN_LEAD = ['new', 'contacted', 'in_progress']

export function payloadStore(payload: Payload): ChatStore {
  const call = (name: 'find' | 'findByID' | 'findGlobal' | 'create' | 'update' | 'delete') =>
    (payload[name] as unknown as Loose).bind(payload)
  const find = call('find') as (args: Record<string, unknown>) => Promise<Docs>
  const findByID = call('findByID')
  const create = call('create')
  const update = call('update')

  async function raw(id: string): Promise<Record<string, unknown> | null> {
    const doc = await findByID({
      collection: 'chat-sessions',
      id: idOf(id),
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
    })
    return doc && typeof doc === 'object' ? (doc as Record<string, unknown>) : null
  }

  async function workIds(publicIds: readonly string[]): Promise<number[]> {
    const ids = publicIds.filter((id) => /^[1-9]\d{0,9}$/.test(id)).map(Number)
    if (ids.length === 0) return []
    const result = await find({
      collection: 'works',
      where: { and: [{ _status: { equals: 'published' } }, { publicId: { in: ids } }] },
      select: { publicId: true },
      depth: 0,
      pagination: false,
      limit: ids.length,
      overrideAccess: false,
    })
    return result.docs.flatMap((doc) => {
      const id = (doc as { id?: unknown }).id
      return typeof id === 'number' ? [id] : []
    })
  }

  return {
    async settings(site, locale) {
      try {
        const doc = await call('findGlobal')({
          slug: 'site-settings',
          select: settingsSelect(site),
          locale,
          fallbackLocale: 'en',
          depth: 0,
          overrideAccess: true,
        })
        return mapSettings(site, doc)
      } catch {
        return null
      }
    },

    async createSession(session) {
      const doc = await create({
        collection: 'chat-sessions',
        data: {
          site: session.site,
          locale: session.locale,
          startedAt: session.startedAt,
          lastMessageAt: session.startedAt,
          ipHash: session.ipHash,
          labels: [...session.labels],
          transcript: [],
          usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
        },
        depth: 0,
        overrideAccess: true,
      })
      const mapped = mapSession(doc)
      if (mapped === null) throw new Error('the new chat session could not be read back')
      return mapped
    },

    async getSession(id) {
      return mapSession(await raw(id))
    },

    async recordTurn(id, turn) {
      const doc = await raw(id)
      const session = mapSession(doc)
      if (doc === null || session === null) return
      const outcome: SessionOutcome | null =
        session.outcome === 'lead' ? 'lead' : (turn.outcome ?? session.outcome)
      const items = new Set(
        (Array.isArray(doc.items) ? doc.items : []).filter((each) => typeof each === 'number'),
      )
      if (session.site === 'gallery')
        for (const each of await workIds(turn.itemIds)) items.add(each)
      const transcript: TranscriptEntry[] = [...session.transcript, ...turn.entries]
      await update({
        collection: 'chat-sessions',
        id: idOf(id),
        data: {
          transcript: transcript.map(({ role, text, at }) => ({ role, text, at })),
          labels: [...session.labels, ...turn.labels],
          lastMessageAt: turn.at,
          usage: {
            inputTokens: session.usage.inputTokens + turn.usage.inputTokens,
            outputTokens: session.usage.outputTokens + turn.usage.outputTokens,
            costUsd: Math.round((session.usage.costUsd + turn.usage.costUsd) * 1e6) / 1e6,
          },
          items: [...items],
          ...(outcome ? { outcome } : {}),
        },
        depth: 0,
        overrideAccess: true,
      })
    },

    async addLabels(id, labels) {
      const session = mapSession(await raw(id))
      if (session === null) return
      await update({
        collection: 'chat-sessions',
        id: idOf(id),
        data: { labels: [...session.labels, ...labels] },
        depth: 0,
        overrideAccess: true,
      })
    },

    async deleteSession(id) {
      await call('delete')({ collection: 'chat-sessions', id: idOf(id), overrideAccess: true })
    },

    async createLead(lead: NewLead) {
      const contact = [
        ...(lead.whatsapp ? [{ 'payload.whatsapp': { equals: lead.whatsapp } }] : []),
        ...(lead.email ? [{ 'payload.email': { equals: lead.email } }] : []),
      ]
      const open = await find({
        collection: 'leads',
        where: {
          and: [
            { site: { equals: lead.site } },
            { kind: { equals: lead.kind } },
            { status: { in: OPEN_LEAD } },
            {
              createdAt: {
                greater_than: new Date(Date.parse(lead.consentAt) - DAY_MS).toISOString(),
              },
            },
            { or: contact },
          ],
        },
        select: { items: true, payload: { message: true } },
        depth: 0,
        limit: 5,
        overrideAccess: true,
      })
      const wanted = [...lead.workIds].map(String).sort().join(',')
      const same = open.docs.find((doc) => {
        const items = (doc as { items?: unknown }).items
        const ids = (Array.isArray(items) ? items : []).map(String).sort().join(',')
        return ids === wanted
      }) as { id?: unknown; payload?: { message?: unknown } } | undefined
      if (same && (typeof same.id === 'number' || typeof same.id === 'string')) {
        const before = typeof same.payload?.message === 'string' ? same.payload.message : ''
        const message = `${before}\n\n— ${lead.consentAt}\n${lead.message}`.slice(-2000)
        await update({
          collection: 'leads',
          id: same.id,
          data: { payload: { message } },
          depth: 0,
          overrideAccess: true,
        })
        return { id: String(same.id), reference: `L-${same.id}` }
      }
      const doc = (await create({
        collection: 'leads',
        data: {
          kind: lead.kind,
          site: lead.site,
          source: 'chat',
          status: 'new',
          payload: {
            name: lead.name,
            whatsapp: lead.whatsapp ?? undefined,
            email: lead.email ?? undefined,
            preferredChannel: lead.preferredChannel,
            message: lead.message,
            locale: lead.locale,
            consentVersion: lead.consentVersion,
            consentAt: lead.consentAt,
          },
          items: lead.workIds.map(Number).filter(Number.isFinite),
          chatSession: idOf(lead.sessionId),
        },
        depth: 0,
        overrideAccess: true,
      })) as { id: number | string }
      return { id: String(doc.id), reference: `L-${doc.id}` }
    },

    async linkLead(sessionId, leadId) {
      await update({
        collection: 'chat-sessions',
        id: idOf(sessionId),
        data: { lead: idOf(leadId), outcome: 'lead' },
        depth: 0,
        overrideAccess: true,
      })
    },

    async spentSince(site, since) {
      let total = 0
      for (let page = 1; page <= 50; page++) {
        const result = await find({
          collection: 'chat-sessions',
          where: {
            and: [
              { site: { equals: site } },
              { lastMessageAt: { greater_than_equal: since.toISOString() } },
            ],
          },
          select: { usage: { costUsd: true } },
          depth: 0,
          limit: 500,
          page,
          overrideAccess: true,
        })
        for (const doc of result.docs) {
          const cost = (doc as { usage?: { costUsd?: unknown } }).usage?.costUsd
          if (typeof cost === 'number' && Number.isFinite(cost)) total += cost
        }
        if (!result.hasNextPage) break
      }
      return total
    },

    async workIdsOf(publicIds) {
      return (await workIds(publicIds)).map(String)
    },
  }
}
