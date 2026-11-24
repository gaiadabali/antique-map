/**
 * The order page (TASKS.md 27.3.b; the plan §3.7): the next step first — ONE large button for the
 * current step, the price form while staff are to quote, the driver's photo while it waits for a
 * driver (required before "on the way", COMMERCE.md §9) — then the facts (`./order-cards.jsx`):
 * buyer, items and total, the pin, the store, the timeline. Below the step, the rarer actions: for
 * the owner and editors reassign (`./reassign-sheet.jsx`), step back, replace, clear the flag and
 * cancel; for store staff hand back. And the packing slip, for whoever wants one.
 *
 * The button posts to the shell's `/api/x/orders/{id}/move`; the fulfilment core (`judgeMove`)
 * decides every move again, so a wrong button here costs a refused click, never a wrong write.
 * Plain links and forms: no client JavaScript. `.jsx`: see `./shared.jsx`'s header.
 */
import { ORDER_STATUS_LABELS } from '../../collections/orders/statuses'
import { BuyerCard, DeliveryCard, ItemsCard, StoreCard, Timeline } from './order-cards'
import { QuotePanel } from './quote-panel'
import { ReassignSheet } from './reassign-sheet'
import { ClearFlagSheet, ReplaceSheet, ReplacementLinks } from './replace-panel'
import {
  BigButton,
  Card,
  L,
  Notice,
  QuietLink,
  StatusTag,
  SubmitButton,
  refusalCopy,
} from './shared'

const MOVE_HOLDS_PHOTO = ['waiting_driver', 'on_the_way', 'processing', 'paid']

function DriverPhoto({ order, language, hasPhoto }) {
  return (
    <div className="od-step">
      <p className={hasPhoto ? undefined : 'ix-muted'}>
        {hasPhoto ? L('driverImageAttached', language) : L('driverImageHint', language)}
      </p>
      <form
        method="post"
        action={`/api/x/orders/${order.id}/driver-image`}
        encType="multipart/form-data"
      >
        <input
          type="file"
          name="file"
          aria-label={L('driverImageFileLabel', language)}
          accept="image/*"
          capture="environment"
          required
          className="ix-input ix-input--file"
        />
        <SubmitButton variant="quiet">{L('driverImageUpload', language)}</SubmitButton>
      </form>
    </div>
  )
}

function MoveButton({ order, to, language }) {
  return (
    <form method="post" action={`/api/x/orders/${order.id}/move`}>
      <input type="hidden" name="to" value={to} />
      <SubmitButton>{L(`nextTo_${to}`, language)}</SubmitButton>
    </form>
  )
}

function NextStep({ order, step, language, payLink, buyerWa }) {
  const next = step.next
  let body
  if (order.status === 'awaiting_quote') {
    body = <QuotePanel order={order} language={language} payLink={payLink} />
  } else if (order.status === 'pending_payment') {
    body = (
      <>
        <p>{L('stepWaitingPayment', language)}</p>
        {buyerWa && <BigButton href={buyerWa}>{L('whatsappToBuyer', language)}</BigButton>}
      </>
    )
  } else if (next && next.to === 'on_the_way' && !step.hasPhoto) {
    body = (
      <>
        <p className="ix-strong">{L('stepNeedsPhoto', language)}</p>
        <DriverPhoto order={order} language={language} hasPhoto={false} />
        <BigButton disabled title={L('stepNeedsPhoto', language)}>
          {L('nextTo_on_the_way', language)}
        </BigButton>
      </>
    )
  } else if (next && next.ok) {
    body = <MoveButton order={order} to={next.to} language={language} />
  } else {
    body = <p className="ix-muted">{L('stepDone', language)}</p>
  }
  return (
    <Card className="ix-card--step od-step">
      <h2 className="ix-card__title">{L('nextStep', language)}</h2>
      {body}
    </Card>
  )
}

function MoreActions({ order, step, language }) {
  const base = `/admin/orders/${order.id}`
  const links = [
    step.canReassign && ['reassign=1', 'reassign', 'quiet'],
    step.canHandBack && ['handback=1', 'handBack', 'quiet'],
    step.canReplace && ['replace=1', 'replaceDamaged', 'quiet'],
    step.canClearFlag && ['clearflag=1', 'clearFlag', 'quiet'],
    ['slip=1', 'packingSlip', 'quiet'],
    step.canCancel && ['cancel=1', 'cancelOrder', 'danger'],
  ].filter(Boolean)
  return (
    <Card>
      <h2 className="ix-card__title">{L('moreActions', language)}</h2>
      <div className="od-row">
        {step.backward && (
          <form method="post" action={`/api/x/orders/${order.id}/move`}>
            <input type="hidden" name="to" value={step.backward} />
            <SubmitButton variant="quiet">
              {L('stepBack', language).replace(
                '{status}',
                ORDER_STATUS_LABELS[step.backward]?.[language],
              )}
            </SubmitButton>
          </form>
        )}
        {links.map(([query, key, variant]) => (
          <BigButton key={key} href={`${base}?${query}`} variant={variant}>
            {L(key, language)}
          </BigButton>
        ))}
      </div>
    </Card>
  )
}

function ReasonSheet({ order, action, to, labelKey, submitKey, language, placeholderKey }) {
  return (
    <Card className="ix-card--step">
      <form method="post" action={`/api/x/orders/${order.id}/${action}`}>
        {to && <input type="hidden" name="to" value={to} />}
        <label htmlFor={`${action}-reason`} className="ix-label">
          {L(labelKey, language)}
        </label>
        <textarea
          id={`${action}-reason`}
          name="reason"
          required
          maxLength={500}
          placeholder={placeholderKey ? L(placeholderKey, language) : undefined}
          className="ix-input ix-input--area"
        />
        <div className="ix-actions">
          <SubmitButton variant={to === 'cancelled' ? 'danger' : 'primary'}>
            {L(submitKey, language)}
          </SubmitButton>
          <QuietLink href={`/admin/orders/${order.id}`}>{L('cancelSheet', language)}</QuietLink>
        </div>
      </form>
    </Card>
  )
}

function Sheet({ order, step, sheet, reassignOptions, language }) {
  if (sheet === 'reassign') {
    return <ReassignSheet order={order} options={reassignOptions ?? []} language={language} />
  }
  if (sheet === 'replace') return <ReplaceSheet order={order} language={language} />
  if (sheet === 'clearflag') return <ClearFlagSheet order={order} language={language} />
  if (sheet === 'cancel') {
    const props = { action: 'move', to: 'cancelled', labelKey: 'cancelReasonLabel' }
    return <ReasonSheet order={order} {...props} submitKey="cancelSubmit" language={language} />
  }
  if (sheet === 'handback') {
    return (
      <ReasonSheet
        order={order}
        action="hand-back"
        labelKey="handBackReasonLabel"
        placeholderKey="handBackReasonPlaceholder"
        submitKey="handBackSubmit"
        language={language}
      />
    )
  }
  void step
  return null
}

export function OrderPage(props) {
  const { order, step, sheet, language, error, linked, store, buyerWa, storeWa } = props
  const refused = error
    ? refusalCopy(error, language).replace('{store}', order.storeSnapshot?.name ?? '—')
    : null
  const photoCard = step.hasPhoto && MOVE_HOLDS_PHOTO.includes(order.status)
  return (
    <main className="ix-page ix-page--wide">
      <QuietLink href="/admin/orders">← {L('inboxTitle', language)}</QuietLink>
      <div className="ix-order-head">
        <h1 className="ix-record">#{order.number}</h1>
        <StatusTag status={order.status}>{ORDER_STATUS_LABELS[order.status]?.[language]}</StatusTag>
      </div>
      <Notice tone="error">{refused}</Notice>
      {order.needsAttention?.flag && (
        <Notice tone="error">
          {L('needsAttention', language)}: {order.needsAttention.reason}
        </Notice>
      )}
      <ReplacementLinks order={order} linked={linked} language={language} />
      <div className="od-order">
        <div className="od-aside od-facts">
          {sheet ? <Sheet {...props} /> : <NextStep {...props} />}
          {photoCard && (
            <Card>
              <h2 className="ix-card__title">{L('driverImageTitle', language)}</h2>
              <DriverPhoto order={order} language={language} hasPhoto />
            </Card>
          )}
          {!sheet && <MoreActions order={order} step={step} language={language} />}
        </div>
        <div className="od-main od-facts">
          <BuyerCard order={order} language={language} buyerWa={buyerWa} />
          <ItemsCard order={order} language={language} />
          <DeliveryCard order={order} language={language} />
          <StoreCard order={order} store={store} storeWa={storeWa} language={language} />
          <Timeline order={order} language={language} />
        </div>
      </div>
    </main>
  )
}
