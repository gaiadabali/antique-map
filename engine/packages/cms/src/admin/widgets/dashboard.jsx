/**
 * Dashboard widgets for TASKS.md 3.6.c: two count-only panels on the admin homepage.
 *
 * Both are server components: they query the Local API through the request's Payload instance
 * with `overrideAccess: false`, so the counts are what each role may read — the owner and an
 * editor see every store's orders, a store user sees only their own, and only the owner sees
 * leads. Access enforces it; the widget merely counts what comes back.
 *
 * This file is `.jsx`, not `.tsx`: the cms package does not type-check React (no `@types/react`
 * in its tsconfig or its dependencies, which this ticket does not own). `dashboard.d.ts` keeps
 * the barrel's exports typed; when the schema lead makes the package JSX-capable this file
 * becomes `.tsx` and the shim goes away.
 */
import { hasRole } from '../../collections/users/roles'
import { ORDER_STATUSES } from '../../collections/orders/statuses'

const COPY = {
  ordersToActOn: {
    en: 'Orders to act on',
    id: 'Pesanan perlu tindakan',
  },
  newLeads: {
    en: 'New leads',
    id: 'Calon pembeli baru',
  },
}

/** Delivered, cancelled and expired orders need nobody's action any more. */
const TERMINAL_STATUSES = ['delivered', 'cancelled', 'expired']
const ACTING_STATUSES = ORDER_STATUSES.filter((s) => !TERMINAL_STATUSES.includes(s))

async function countOrders({ req }) {
  try {
    const result = await req.payload.find({
      collection: 'orders',
      depth: 0,
      limit: 0,
      overrideAccess: false,
      user: req.user,
      where: { status: { in: ACTING_STATUSES } },
    })
    return result.totalDocs ?? 0
  } catch {
    return 0
  }
}

async function countNewLeads({ req }) {
  if (!hasRole(req.user, 'owner')) return 0
  try {
    const result = await req.payload.find({
      collection: 'leads',
      depth: 0,
      limit: 0,
      overrideAccess: false,
      user: req.user,
      where: { status: { equals: 'new' } },
    })
    return result.totalDocs ?? 0
  } catch {
    return 0
  }
}

/**
 * The admin's language — the one the person picked on their profile (`req.i18n`). Not the
 * widget's `locale` prop: that is the content locale (an object), which says nothing about the
 * language the admin is shown in.
 */
function label(key, req) {
  return COPY[key][req?.i18n?.language] ?? COPY[key].en
}

export async function OrdersToActOnWidget({ req }) {
  const count = await countOrders({ req })
  return (
    <a href="/admin/collections/orders">
      {label('ordersToActOn', req)}: {count}
    </a>
  )
}

/** The owner's panel alone: for anyone else it renders nothing, rather than a count of 0. */
export async function NewLeadsWidget({ req }) {
  if (!hasRole(req?.user, 'owner')) return null
  const count = await countNewLeads({ req })
  return (
    <a href="/admin/collections/leads">
      {label('newLeads', req)}: {count}
    </a>
  )
}
