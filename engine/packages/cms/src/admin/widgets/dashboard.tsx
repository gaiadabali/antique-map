/**
 * Dashboard widgets for TASKS.md 3.6.c: two count-only panels, rendered on the admin homepage.
 *
 * Both are server components: they query the Local API through the request's Payload instance,
 * so the counts respect the signed-in user's access (owner/editor see every store, a store user
 * sees only their own orders, and only the owner sees leads).
 */
import { Card } from '@payloadcms/ui/elements/Card'
import type { WidgetServerProps } from 'payload/admin/views/dashboard'
import React from 'react'

import { hasRole } from '../../access/roles'
import { ORDER_STATUSES } from '../../collections/orders/statuses'
import type { CmsLocale } from '../../payload.config'

const COPY = {
  ordersToActOn: {
    en: 'Orders to act on',
    id: 'Pesanan perlu tindakan',
  },
  newLeads: {
    en: 'New leads',
    id: 'Calon pembeli baru',
  },
} as const

const TERMINAL_STATUSES = ['delivered', 'cancelled', 'expired']
const ACTING_STATUSES = ORDER_STATUSES.filter((s) => !TERMINAL_STATUSES.includes(s))

async function countOrders({ req }: WidgetServerProps): Promise<number> {
  try {
    const result = await req.payload.find({
      collection: 'orders',
      depth: 0,
      limit: 0,
      overrideAccess: false,
      where: { status: { in: ACTING_STATUSES } },
    })
    return result.totalDocs ?? 0
  } catch {
    return 0
  }
}

async function countNewLeads({ req }: WidgetServerProps): Promise<number> {
  if (!hasRole(req.user, 'owner')) return 0
  try {
    const result = await req.payload.find({
      collection: 'leads',
      depth: 0,
      limit: 0,
      overrideAccess: false,
      where: { status: { equals: 'new' } },
    })
    return result.totalDocs ?? 0
  } catch {
    return 0
  }
}

function label(key: keyof typeof COPY, locale: CmsLocale): string {
  return COPY[key][locale] ?? COPY[key].en
}

export async function OrdersToActOnWidget(props: WidgetServerProps): Promise<React.ReactElement> {
  const count = await countOrders(props)
  const locale = (props.locale ?? 'en') as CmsLocale
  return (
    <Card href="/admin/collections/orders" title={`${label('ordersToActOn', locale)} — ${count}`} />
  )
}

export async function NewLeadsWidget(props: WidgetServerProps): Promise<React.ReactElement> {
  const count = await countNewLeads(props)
  const locale = (props.locale ?? 'en') as CmsLocale
  return <Card href="/admin/collections/leads" title={`${label('newLeads', locale)} — ${count}`} />
}
