/**
 * The shop's own panels (ANALYTICS.md §8): Funnel and Web vitals from the beacon and server events;
 * Sales, Fulfilment and Payments from the records (`orders`, `payment-events`) — never from events,
 * which a replayed or rolled-back payment could contradict (ANALYTICS.md §1).
 */
import { ORDER_STATUS_LABELS } from '../../collections/orders/statuses'

import { text, word } from './copy'
import { formatNumber, formatRate, formatRupiah } from './format'
import { Empty, Panel, Ranked, RankedMoney, S, Stat } from './ui'

const statusLabel = (language, status) =>
  ORDER_STATUS_LABELS[status] ? ORDER_STATUS_LABELS[status][language === 'id' ? 'id' : 'en'] : status

export function SalesPanel({ data, language }) {
  const t = (key) => text(language, key)
  if (!data || !data.hasData) {
    return (
      <Panel title={t('sales')}>
        <Empty message={t('noEvents')} />
      </Panel>
    )
  }
  const rupiah = (n) => formatRupiah(n, language)
  return (
    <Panel title={t('sales')} note={t('businessNote')}>
      <div style={S.stats}>
        <Stat label={t('paidOrders')} value={data.paidOrders} language={language} />
        <Stat label={t('revenue')} value={data.revenue} language={language} format={rupiah} />
        <Stat
          label={t('averageOrder')}
          value={data.averageOrder}
          language={language}
          format={rupiah}
        />
        <Stat
          label={t('discountShare')}
          value={data.discountShare}
          language={language}
          digits={1}
        />
        <Stat
          label={t('freeDeliveryShare')}
          value={data.freeDeliveryShare}
          language={language}
          digits={1}
        />
      </div>
      <h3 style={S.h3}>{t('byStore')}</h3>
      <RankedMoney rows={data.byStore} language={language} formatMoney={rupiah} />
      <h3 style={S.h3}>{t('byDistanceBand')}</h3>
      <RankedMoney rows={data.byDistanceBand} language={language} formatMoney={rupiah} />
      <h3 style={S.h3}>{t('byProduct')}</h3>
      <RankedMoney rows={data.byProduct} language={language} formatMoney={rupiah} />
      <h3 style={S.h3}>{t('byCategory')}</h3>
      <RankedMoney
        rows={data.byCategory}
        language={language}
        formatMoney={rupiah}
        label={(key) => word(language, key)}
      />
    </Panel>
  )
}

function DurationTable({ rows, language }) {
  if (rows.length === 0) return <Empty message={text(language, 'noList')} />
  return (
    <table style={S.table}>
      <tbody>
        {rows.map((row) => (
          <tr key={row.store}>
            <td style={S.cell}>{row.store}</td>
            <td style={S.num}>
              {row.medianHours === null ? '—' : formatNumber(row.medianHours, language, 1)}
              <div style={S.muted}>{formatNumber(row.orders, language)}</div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function FulfilmentPanel({ data, language }) {
  const t = (key) => text(language, key)
  if (!data || !data.hasData) {
    return (
      <Panel title={t('fulfilment')}>
        <Empty message={t('noEvents')} />
      </Panel>
    )
  }
  return (
    <Panel title={t('fulfilment')}>
      <h3 style={S.h3}>{t('ordersWaitingNow')}</h3>
      <table style={S.table}>
        <tbody>
          {data.waitingNow.map((row) => (
            <tr key={row.status}>
              <td style={S.cell}>{statusLabel(language, row.status)}</td>
              <td style={S.num}>{formatNumber(row.count, language)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={S.stats}>
        <Stat
          label={t('expiredCancelledShare')}
          value={data.expiredCancelledShare}
          language={language}
          digits={1}
        />
      </div>
      <h3 style={S.h3}>
        {t('paidToProcessing')} ({t('medianHoursShort')})
      </h3>
      <DurationTable rows={data.paidToProcessing} language={language} />
      <h3 style={S.h3}>
        {t('processingToOnTheWay')} ({t('medianHoursShort')})
      </h3>
      <DurationTable rows={data.processingToOnTheWay} language={language} />
      <h3 style={S.h3}>
        {t('onTheWayToDelivered')} ({t('medianHoursShort')})
      </h3>
      <DurationTable rows={data.onTheWayToDelivered} language={language} />
    </Panel>
  )
}

export function PaymentsPanel({ data, language }) {
  const t = (key) => text(language, key)
  if (!data || !data.hasData) {
    return (
      <Panel title={t('payments')}>
        <Empty message={t('noEvents')} />
      </Panel>
    )
  }
  return (
    <Panel title={t('payments')} note={t('flaggedNote')}>
      <div style={S.stats}>
        <Stat
          label={t('expiredUnpaidRate')}
          value={data.expiredUnpaidRate}
          language={language}
          digits={1}
        />
      </div>
      <h3 style={S.h3}>{t('methodMix')}</h3>
      <Ranked rows={data.methodMix} language={language} />
      <h3 style={S.h3}>{t('flaggedPayments')}</h3>
      <Ranked rows={data.flagged} language={language} label={(key) => word(language, key)} />
    </Panel>
  )
}

export function FunnelPanel({ data, language }) {
  const t = (key) => text(language, key)
  if (!data || !data.hasData) {
    return (
      <Panel title={t('funnel')}>
        <Empty message={t('noEvents')} />
      </Panel>
    )
  }
  return (
    <Panel title={t('funnel')}>
      <table style={S.table}>
        <tbody>
          {data.steps.map((step, i) => {
            const before = data.steps[i - 1]
            const drop =
              i === 0 || !before || before.count.current === 0
                ? null
                : 100 - (step.count.current / before.count.current) * 100
            return (
              <tr key={step.key}>
                <td style={S.cell}>{t(step.label)}</td>
                <td style={S.num}>{formatNumber(step.count.current, language)}</td>
                <td style={S.num}>{drop === null ? '—' : `−${formatRate(drop / 100)}`}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <h3 style={S.h3}>{t('funnelByDevice')}</h3>
      {data.byDevice.length === 0 ? (
        <Empty message={t('noList')} />
      ) : (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.cell}>{t('device')}</th>
              {data.steps.map((step) => (
                <th key={step.key} style={S.num}>
                  {t(step.label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.byDevice.map((row) => (
              <tr key={row.device}>
                <td style={S.cell}>{word(language, row.device)}</td>
                {data.steps.map((step) => (
                  <td key={step.key} style={S.num}>
                    {formatNumber(row.steps[step.key] ?? 0, language)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h3 style={S.h3}>{t('blockedByReason')}</h3>
      <Ranked
        rows={data.blockedByReason}
        language={language}
        label={(key) => word(language, key)}
      />
    </Panel>
  )
}

export function VitalsPanel({ data, language }) {
  const t = (key) => text(language, key)
  if (!data || !data.hasData) {
    return (
      <Panel title={t('vitals')}>
        <Empty message={t('noEvents')} />
      </Panel>
    )
  }
  return (
    <Panel title={t('vitals')}>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.cell}>{t('pageType')}</th>
            <th style={S.cell}>{t('device')}</th>
            <th style={S.num}>{t('vitalsLcp')}</th>
            <th style={S.num}>{t('vitalsInp')}</th>
            <th style={S.num}>{t('vitalsCls')}</th>
            <th style={S.num}>{t('samples')}</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={`${row.pageType}-${row.device}`}>
              <td style={S.cell}>{row.pageType}</td>
              <td style={S.cell}>{word(language, row.device)}</td>
              <td style={S.num}>{row.lcp === null ? '—' : formatNumber(row.lcp / 1000, language, 2)}</td>
              <td style={S.num}>{row.inp === null ? '—' : formatNumber(row.inp, language, 0)}</td>
              <td style={S.num}>{row.cls === null ? '—' : formatNumber(row.cls, language, 3)}</td>
              <td style={S.num}>{formatNumber(row.samples, language)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}
