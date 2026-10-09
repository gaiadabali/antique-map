/**
 * The custom admin view registered at `/orders/:id?` (TASKS.md 7.2; `../../registries/views.ts`):
 * a store user's queue and order screen, or the owner/editor's filtered list and order screen,
 * decided by `req.user.role` — the core (`judgeMove`, `../../shop/fulfilment`) still refuses any
 * move this view got wrong, so a mistake here costs a refused click, never a wrong write.
 * `.jsx`: see `shared.jsx`'s header.
 */
import { roleOf, storeOf } from '../../collections/users/roles'
import { judgeMove } from '../../shop/fulfilment/transitions'
import {
  loadActiveStores,
  loadDriverImagePreview,
  loadLinkedOrders,
  loadOrder,
  loadOrderPayLink,
  loadOwnerOrders,
  loadStoreQueue,
} from './data'
import { OwnerDetail, OwnerFilterBar, OwnerList } from './owner-panel'
import { L, Notice, str } from './shared'
import { nextBackward, nextForward, nextStep } from './status-help'
import { StoreDetail, StoreQueue } from './store-panel'

function storeIdOf(order) {
  return typeof order.store === 'number' ? order.store : (order.store?.id ?? null)
}

function buildStoreStep({ order, actorStore, role, searchParams }) {
  const hasDriverImage = Boolean(order.driverImage?.key)
  const next = nextStep({
    role,
    actorStore,
    orderStore: storeIdOf(order),
    status: order.status,
    hasDriverImage,
  })
  const confirmParam = str(searchParams.confirm)
  const confirmTo = next && next.to === confirmParam && next.judgement.ok ? confirmParam : null
  const canHandBack = ['paid', 'processing', 'waiting_driver'].includes(order.status)
  const handback = canHandBack && str(searchParams.handback) === '1'
  return { next, confirmTo, canHandBack, handback }
}

function buildOwnerStep({ order, role, searchParams }) {
  const orderStore = storeIdOf(order)
  const hasDriverImage = Boolean(order.driverImage?.key)
  const forwardTo = nextForward(order.status)
  const forwardOk =
    forwardTo &&
    judgeMove({
      role,
      actorStore: null,
      orderStore,
      from: order.status,
      to: forwardTo,
      hasDriverImage,
    }).ok
  const backwardTo = nextBackward(order.status)
  const backwardOk =
    backwardTo &&
    judgeMove({
      role,
      actorStore: null,
      orderStore,
      from: order.status,
      to: backwardTo,
      hasDriverImage,
    }).ok
  const canCancel = !['delivered', 'cancelled', 'expired'].includes(order.status)
  const canReassign = order.status === 'paid' || order.status === 'processing'
  // TASKS.md 10.7: the core refuses anything else (`replaceDamagedItem`, `clearOrderFlag`).
  const canReplace = order.status === 'delivered'
  const canClearFlag = Boolean(order.needsAttention?.flag)
  return {
    forward: forwardOk ? { to: forwardTo } : null,
    backward: backwardOk ? backwardTo : null,
    canCancel,
    canReassign,
    reassigning: canReassign && str(searchParams.reassign) === '1',
    cancelling: canCancel && str(searchParams.cancel) === '1',
    canReplace,
    replacing: canReplace && str(searchParams.replace) === '1',
    canClearFlag,
    clearingFlag: canClearFlag && str(searchParams.clearflag) === '1',
  }
}

export async function OrdersPanelView(props) {
  const req = props.initPageResult?.req
  const language = props.i18n?.language === 'id' ? 'id' : 'en'
  const role = roleOf(req?.user)
  if (role === null) return <Notice tone="error">{L('refusal_not_staff', language)}</Notice>

  const payload = props.payload
  // Payload matches the registered path (`/orders/:id?`, `../../registries/views.ts`) but does not
  // parse its named segment for a plain custom view — only `params.segments`, the catch-all
  // route's raw pieces, reaches here: `['orders']` for the list, `['orders', '123']` for an order.
  const segments = Array.isArray(props.params?.segments) ? props.params.segments : []
  const id = segments[1] ?? ''
  const searchParams = props.searchParams ?? {}
  const error = str(searchParams.error) || null

  if (role === 'store') {
    const actorStore = storeOf(req.user)
    if (!id) {
      const orders = await loadStoreQueue(payload, req)
      return (
        <div>
          <h1>{L('queueTitle', language)}</h1>
          <StoreQueue orders={orders} language={language} />
        </div>
      )
    }
    const orderId = Number(id)
    const order = Number.isInteger(orderId) ? await loadOrder(payload, req, orderId) : null
    if (!order) return <Notice tone="error">{L('refusal_not_found', language)}</Notice>
    const step = buildStoreStep({ order, actorStore, role, searchParams })
    const [imagePreviewUrl, payLink, linked] = await Promise.all([
      loadDriverImagePreview(payload, order),
      order.status === 'awaiting_quote' ? loadOrderPayLink(payload, req, order) : null,
      loadLinkedOrders(payload, req, order),
    ])
    return (
      <StoreDetail
        order={order}
        step={step}
        language={language}
        imagePreviewUrl={imagePreviewUrl}
        payLink={payLink}
        linked={linked}
        error={error}
      />
    )
  }

  if (!id) {
    const status = str(searchParams.status)
    const storeFilter = str(searchParams.store)
    const [orders, stores] = await Promise.all([
      loadOwnerOrders(payload, req, {
        status: status || undefined,
        store: storeFilter ? Number(storeFilter) : undefined,
      }),
      loadActiveStores(payload, req),
    ])
    return (
      <div>
        <h1>{L('ordersTitle', language)}</h1>
        <OwnerFilterBar
          stores={stores}
          filter={{ status, store: storeFilter }}
          language={language}
        />
        <OwnerList orders={orders} language={language} />
      </div>
    )
  }

  const orderId = Number(id)
  const order = Number.isInteger(orderId) ? await loadOrder(payload, req, orderId) : null
  if (!order) return <Notice tone="error">{L('refusal_not_found', language)}</Notice>
  const [stores, payLink, linked] = await Promise.all([
    loadActiveStores(payload, req),
    order.status === 'awaiting_quote' ? loadOrderPayLink(payload, req, order) : null,
    loadLinkedOrders(payload, req, order),
  ])
  const step = buildOwnerStep({ order, role, searchParams })
  return (
    <OwnerDetail
      order={order}
      stores={stores}
      step={step}
      language={language}
      payLink={payLink}
      linked={linked}
      error={error}
    />
  )
}
