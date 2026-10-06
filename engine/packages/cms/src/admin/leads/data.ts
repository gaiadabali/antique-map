/**
 * What the leads inbox reads (TASKS.md 9.1.a): the Local API only, `overrideAccess: false`, so a
 * non-owner's request returns nothing through access, not through a check repeated here
 * (`collections/leads/index.ts`'s `LEADS_ACCESS`).
 */
import type { Payload, PayloadRequest, Where } from 'payload'

import { LEAD_STATUSES, type LeadKind, type LeadStatus } from '../../collections/leads/kinds'

export const INBOX_PAGE_SIZE = 25

/** A lead row as the inbox reads it (`INBOX_ROW_SELECT`), shaped as Payload returns it. */
export type LeadRow = {
  readonly id: number
  readonly kind: LeadKind
  readonly site: 'gallery' | 'shop'
  readonly status: LeadStatus
  readonly payload?: {
    readonly name?: string | null
    readonly preferredChannel?: string | null
    readonly message?: string | null
  } | null
  readonly createdAt: string
}

const INBOX_ROW_SELECT = {
  kind: true,
  site: true,
  status: true,
  payload: true,
  createdAt: true,
} as const

export type InboxFilter = {
  readonly site?: string
  readonly kind?: string
  readonly status?: string
  readonly page?: number
}

function filterWhere(filter: Pick<InboxFilter, 'site' | 'kind' | 'status'>): Where | undefined {
  const and: Where[] = []
  if (filter.site) and.push({ site: { equals: filter.site } })
  if (filter.kind) and.push({ kind: { equals: filter.kind } })
  and.push({ status: { equals: filter.status || 'new' } })
  return and.length ? { and } : undefined
}

export async function loadInboxLeads(
  payload: Payload,
  req: PayloadRequest,
  filter: InboxFilter,
): Promise<{ docs: readonly LeadRow[]; totalDocs: number; totalPages: number; page: number }> {
  const page = filter.page && filter.page > 0 ? filter.page : 1
  const result = await payload.find({
    collection: 'leads',
    depth: 0,
    limit: INBOX_PAGE_SIZE,
    page,
    overrideAccess: false,
    user: req.user,
    req,
    select: INBOX_ROW_SELECT,
    sort: '-createdAt',
    where: filterWhere(filter),
  })
  return {
    docs: result.docs as unknown as LeadRow[],
    totalDocs: result.totalDocs ?? 0,
    totalPages: result.totalPages ?? 1,
    page: result.page ?? page,
  }
}

/** One count per status, for the filter bar's badges — the current site/kind filter, any status. */
export async function loadStatusCounts(
  payload: Payload,
  req: PayloadRequest,
  filter: Pick<InboxFilter, 'site' | 'kind'>,
): Promise<Record<LeadStatus, number>> {
  const counts = {} as Record<LeadStatus, number>
  await Promise.all(
    LEAD_STATUSES.map(async (status) => {
      const and: Where[] = [{ status: { equals: status } }]
      if (filter.site) and.push({ site: { equals: filter.site } })
      if (filter.kind) and.push({ kind: { equals: filter.kind } })
      const result = await payload.find({
        collection: 'leads',
        depth: 0,
        limit: 0,
        overrideAccess: false,
        user: req.user,
        req,
        where: { and },
      })
      counts[status] = result.totalDocs ?? 0
    }),
  )
  return counts
}

/** How long ago `at` was, in the admin's language — "3 h ago", "2 d ago", or "just now". */
export function timeAgo(at: string | Date, language: 'en' | 'id'): string {
  const ms = Date.now() - new Date(at).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return language === 'id' ? 'baru saja' : 'just now'
  if (minutes < 60) return language === 'id' ? `${minutes} mnt lalu` : `${minutes} m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return language === 'id' ? `${hours} jam lalu` : `${hours} h ago`
  const days = Math.floor(hours / 24)
  return language === 'id' ? `${days} hr lalu` : `${days} d ago`
}

/** The first line of a message, truncated — the inbox never shows more (TASKS.md 9.1.a). */
export function firstLine(message: string | null | undefined, maxLength = 140): string {
  if (!message) return ''
  const line = message.split(/\r?\n/)[0] ?? ''
  return line.length > maxLength ? `${line.slice(0, maxLength)}…` : line
}
