/**
 * The orders door (TASKS.md 27.3; registered at `/orders/:id?`, `../../registries/views.ts`): the
 * inbox (`./inbox-view.jsx`) at `/admin/orders`, the order page (`./order-page.jsx`) at
 * `/admin/orders/{id}`, and its packing slip at `?slip=1`. The same screens for every member of
 * staff; what each may do is decided by role here only to choose which buttons to show — the
 * fulfilment core (`judgeMove`, `reassignOrder`, …) refuses anything this view got wrong, and the
 * collection's access scopes every read to a store user's own store. `.jsx`: see `shared.jsx`.
 */
import { roleOf, storeOf } from '@engine/cms-core/access'

import { judgeMove } from '../../shop/fulfilment/transitions'
import { loadActiveStores, loadLinkedOrders, loadOrder, loadOrderPayLink } from './data'
import { tabOf } from './inbox'
import { loadInbox, loadReassignOptions, loadStoreCard } from './inbox-data'
import { Inbox } from './inbox-view'
import { OrderPage } from './order-page'
import { PackingSlip } from './reassign-sheet'
import { L, Notice, str } from './shared'
import { nextBackward, nextForward } from './status-help'
import { OrdersStyles } from './styles-client'
import { buyerMessage, storeMessage, waLink } from './wa'
import { AdminPage } from '@engine/cms-core/admin/page'

const SHEETS = ['reassign', 'cancel', 'replace', 'clearflag', 'handback']

function storeIdOf(order) {
  return typeof order.store === 'number' ? order.store : (order.store?.id ?? null)
}

/** What this person may do on this order now: the one next move and the rarer actions. */
function stepFor({ order, role, actorStore }) {
  const manager = role === 'owner' || role === 'editor'
  const hasPhoto = Boolean(order.driverImage?.key)
  const judge = (to) =>
    judgeMove({
      role,
      actorStore: manager ? null : actorStore,
      orderStore: storeIdOf(order),
      from: order.status,
      to,
      hasDriverImage: hasPhoto,
    }).ok
  const forward = nextForward(order.status)
  const backward = manager ? nextBackward(order.status) : null
  const open = !['delivered', 'cancelled', 'expired'].includes(order.status)
  return {
    hasPhoto,
    next: forward ? { to: forward, ok: judge(forward) } : null,
    backward: backward && judge(backward) ? backward : null,
    canCancel: manager && open,
    canReassign: manager && (order.status === 'paid' || order.status === 'processing'),
    canReplace: manager && order.status === 'delivered',
    canClearFlag: manager && Boolean(order.needsAttention?.flag),
    canHandBack: !manager && ['paid', 'processing', 'waiting_driver'].includes(order.status),
  }
}

/** The view inside Payload's page frame (`../page.jsx`): the sidebar stays on every screen. */
export async function OrdersPanelView(props) {
  return (
    <AdminPage view={props}>
      <OrdersStyles />
      {await OrdersPanelViewBody(props)}
    </AdminPage>
  )
}

async function OrdersPanelViewBody(props) {
  const req = props.initPageResult?.req
  const language = props.i18n?.language === 'id' ? 'id' : 'en'
  const role = roleOf(req?.user)
  if (role === null) return <Notice tone="error">{L('refusal_not_staff', language)}</Notice>
  const manager = role === 'owner' || role === 'editor'

  const payload = props.payload
  // Payload matches the registered path (`/orders/:id?`) but hands a plain custom view only the
  // catch-all route's raw pieces: `['orders']` for the inbox, `['orders', '123']` for an order.
  const segments = Array.isArray(props.params?.segments) ? props.params.segments : []
  const id = segments[1] ?? ''
  const searchParams = props.searchParams ?? {}

  if (!id) {
    const storeParam = Number(str(searchParams.store))
    const query = {
      tab: tabOf(str(searchParams.tab)),
      q: str(searchParams.q).trim().slice(0, 80),
      store: manager && Number.isSafeInteger(storeParam) && storeParam > 0 ? storeParam : null,
      page: Math.max(1, Math.floor(Number(str(searchParams.page))) || 1),
    }
    const [inbox, stores] = await Promise.all([
      loadInbox(payload, req, query),
      manager ? loadActiveStores(payload, req) : null,
    ])
    return (
      <Inbox inbox={inbox} query={query} stores={stores} showStore={manager} language={language} />
    )
  }

  const orderId = Number(id)
  const order = Number.isSafeInteger(orderId) ? await loadOrder(payload, req, orderId) : null
  if (!order) return <Notice tone="error">{L('refusal_not_found', language)}</Notice>
  if (str(searchParams.slip) === '1') {
    const store = await loadStoreCard(payload, req, storeIdOf(order))
    return <PackingSlip order={order} store={store} language={language} />
  }

  const step = stepFor({ order, role, actorStore: storeOf(req.user) })
  const asked = SHEETS.find((sheet) => str(searchParams[sheet]) === '1') ?? null
  const allowed = {
    reassign: step.canReassign,
    cancel: step.canCancel,
    replace: step.canReplace,
    clearflag: step.canClearFlag,
    handback: step.canHandBack,
  }
  const sheet = asked && allowed[asked] ? asked : null
  const beforePayment = order.status === 'awaiting_quote' || order.status === 'pending_payment'
  const [linked, store, payLink, reassignOptions] = await Promise.all([
    loadLinkedOrders(payload, req, order),
    loadStoreCard(payload, req, storeIdOf(order)),
    beforePayment ? loadOrderPayLink(payload, req, order) : null,
    sheet === 'reassign' ? loadReassignOptions(payload, req, order) : null,
  ])
  const buyerWa = waLink(
    order.contact?.whatsapp,
    buyerMessage({
      locale: order.contact?.locale === 'id' ? 'id' : 'en',
      name: String(order.contact?.name ?? ''),
      number: order.number,
      status: order.status,
      payLink,
    }),
  )
  const storeWa = store?.whatsapp
    ? waLink(
        store.whatsapp,
        storeMessage({
          language,
          number: order.number,
          lines: order.lines,
          area: String(order.delivery?.address ?? ''),
        }),
      )
    : null
  return (
    <OrderPage
      order={order}
      step={step}
      sheet={sheet}
      language={language}
      error={str(searchParams.error) || null}
      linked={linked}
      store={store}
      payLink={payLink}
      buyerWa={buyerWa}
      storeWa={storeWa}
      reassignOptions={reassignOptions}
    />
  )
}
