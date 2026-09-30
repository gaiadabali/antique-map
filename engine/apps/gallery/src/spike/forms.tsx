/**
 * The spike's forms, rendered in the page's own body — in the first flush, never inside a
 * `<Suspense>` — so each works without JavaScript: a POST that answers 303 to the page (C13).
 */
import type { Messages } from '@engine/i18n'

import { editRecord, removeBagLine, setAvailability, setShipTo } from './actions'
import type { SpikeMessageKey } from './messages'
import type { ShipToOption } from './ship-to'
import type { Availability } from './store'

type T = Messages<SpikeMessageKey>['t']

export function ShipToForm(props: {
  readonly t: T
  readonly options: readonly ShipToOption[]
  readonly current: ShipToOption | null
  readonly returnTo: string
}) {
  const { t, options, current, returnTo } = props
  return (
    <form action={setShipTo} className="spike-form" data-form="ship-to">
      <input type="hidden" name="returnTo" value={returnTo} />
      <label>
        {t('spike.shipTo.legend')}{' '}
        <select name="country" defaultValue={current?.country}>
          {options.map((option) => (
            <option key={option.country} value={option.country}>
              {option.country} · {option.currency}
            </option>
          ))}
        </select>
      </label>{' '}
      <button type="submit">{t('spike.shipTo.submit')}</button>
    </form>
  )
}

export function BagSection(props: {
  readonly t: T
  readonly lines: readonly { readonly id: number; readonly title: string }[]
  readonly returnTo: string
}) {
  const { t, lines, returnTo } = props
  return (
    <section className="spike-bag" aria-labelledby="bag-title">
      <h2 id="bag-title">{t('spike.bag.title')}</h2>
      {lines.length === 0 ? <p>{t('spike.bag.empty')}</p> : null}
      <ul>
        {lines.map((line) => (
          <li key={line.id}>
            <span id={`bag-line-${line.id}`}>{line.title}</span>{' '}
            <form action={removeBagLine} className="spike-inline-form" data-form="bag-remove">
              <input type="hidden" name="returnTo" value={returnTo} />
              <input type="hidden" name="line" value={line.id} />
              {/* The visible "Remove" is the start of its name, then the line it removes. */}
              <button type="submit" aria-label={t('spike.bag.removeLine', { title: line.title })}>
                {t('spike.bag.remove')}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Only with `SPIKE_CONTROLS=1`, which no host sets: what a sale and an editor's publish do. */
export function SpikeControls(props: {
  readonly t: T
  readonly id: number
  readonly availability: Availability
  readonly returnTo: string
}) {
  const { t, id, availability, returnTo } = props
  const to = availability === 'sold' ? 'available' : 'sold'
  return (
    <section className="spike-controls" aria-label={t('spike.controls.title')}>
      <form action={setAvailability} data-form="availability">
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="item" value={id} />
        <input type="hidden" name="to" value={to} />
        <button type="submit">
          {t(to === 'sold' ? 'spike.controls.sell' : 'spike.controls.release', { id: String(id) })}
        </button>
      </form>
      <form action={editRecord} data-form="edit">
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="item" value={id} />
        <button type="submit">{t('spike.controls.edit', { id: String(id) })}</button>
      </form>
    </section>
  )
}
