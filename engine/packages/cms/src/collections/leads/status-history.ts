import type { CollectionBeforeChangeHook } from 'payload'

import type { LeadStatus, StatusHistoryRow } from './kinds'

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  return String(value)
}

function asStatus(value: unknown): LeadStatus | null {
  const s = asString(value)
  if (s === 'new' || s === 'contacted' || s === 'in_progress' || s === 'closed' || s === 'spam')
    return s
  return null
}

export const appendStatusHistory: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const incoming = asStatus(data.status)
  const previous = operation === 'update' ? asStatus(originalDoc?.status) : null
  if (!incoming || incoming === previous) return data

  // `closedAt` is the retention clock (COMPLIANCE §1): stamped on closing, cleared on reopening.
  // It is never taken from the request, so a client cannot back-date or hide a closed lead.
  const closedAt = incoming === 'closed' ? new Date().toISOString() : null

  const history = Array.isArray(data.statusHistory)
    ? ([...data.statusHistory] as StatusHistoryRow[])
    : []
  const by = req.user?.id ?? null
  history.push({
    status: incoming,
    by: typeof by === 'number' || typeof by === 'string' ? by : null,
    at: new Date().toISOString(),
  })
  return { ...data, statusHistory: history, closedAt }
}
