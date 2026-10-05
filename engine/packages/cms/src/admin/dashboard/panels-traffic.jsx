/**
 * The traffic panels: Visitors, Search and Antiques (ANALYTICS.md §8). Each takes the panel's
 * loaded data (`./loaders`) and the admin's language and renders; none reads anything. A panel with
 * no events says so, rather than showing zeros with deltas.
 */
import { text, word } from './copy'
import { formatNumber, formatRate } from './format'
import { Empty, Panel, Ranked, S, Stat } from './ui'

export function VisitorsPanel({ data, language }) {
  const t = (key) => text(language, key)
  if (!data.hasData) {
    return (
      <Panel title={t('visitors')}>
        <Empty message={t('noEvents')} />
      </Panel>
    )
  }
  const top = Math.max(...data.daily.map((d) => d.pageViews), 1)
  return (
    <Panel title={t('visitors')}>
      <div style={S.stats}>
        <Stat label={t('sessions')} value={data.sessions} language={language} />
        <Stat label={t('pageViews')} value={data.pageViews} language={language} />
      </div>
      <h3 style={S.h3}>
        {t('perDay')}: {t('sessions')} / {t('pageViews')}
      </h3>
      <table style={S.table}>
        <tbody>
          {data.daily.map((d) => (
            <tr key={d.day}>
              <td style={S.cell}>
                {d.day}
                <div style={S.track} aria-hidden="true">
                  <div
                    style={{
                      height: '100%',
                      width: `${(d.pageViews / top) * 100}%`,
                      background: 'var(--theme-elevation-500)',
                    }}
                  />
                </div>
              </td>
              <td style={S.num}>
                {formatNumber(d.sessions, language)} / {formatNumber(d.pageViews, language)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 style={S.h3}>{t('topPages')}</h3>
      <Ranked rows={data.topPaths} language={language} />
      <h3 style={S.h3}>{t('referrers')}</h3>
      <Ranked rows={data.referrers} language={language} />
      <h3 style={S.h3}>{t('utmSources')}</h3>
      <Ranked rows={data.utmSources} language={language} />
      <h3 style={S.h3}>{t('devices')}</h3>
      <Ranked rows={data.devices} language={language} label={(key) => word(language, key)} />
      <h3 style={S.h3}>{t('languages')}</h3>
      <Ranked rows={data.locales} language={language} label={(key) => word(language, key)} />
    </Panel>
  )
}

export function SearchPanel({ data, language }) {
  const t = (key) => text(language, key)
  if (!data.hasData) {
    return (
      <Panel title={t('search')}>
        <Empty message={t('noEvents')} />
      </Panel>
    )
  }
  return (
    <Panel title={t('search')}>
      <div style={S.stats}>
        <Stat label={t('searches')} value={data.searches} language={language} />
        <Stat label={t('zeroResultsCount')} value={data.zeroResults} language={language} />
      </div>
      <h3 style={S.h3}>{t('zeroQueries')}</h3>
      <Ranked rows={data.zeroResultQueries} language={language} />
      <h3 style={S.h3}>{t('topQueries')}</h3>
      <Ranked rows={data.topQueries} language={language} />
    </Panel>
  )
}

function AntiqueTable({ rows, language, columns }) {
  if (rows.length === 0) return <Empty message={text(language, 'noList')} />
  return (
    <table style={S.table}>
      <thead>
        <tr>
          <th style={S.cell} />
          {columns.map((c) => (
            <th key={c.key} style={S.num}>
              {text(language, c.label)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.workId}>
            <td style={S.cell}>
              <a href={`/admin/collections/works/${row.workId}`}>
                {row.title ?? text(language, 'untitled')}
              </a>
              {row.stockNumber ? <span style={S.muted}> {row.stockNumber}</span> : null}
            </td>
            {columns.map((c) => (
              <td key={c.key} style={S.num}>
                {c.value(row, language)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const VIEW_COLUMNS = [
  { key: 'views', label: 'views', value: (r, l) => formatNumber(r.views.current, l) },
  { key: 'asks', label: 'asks', value: (r, l) => formatNumber(r.asks, l) },
  { key: 'rate', label: 'askRate', value: (r) => formatRate(r.askRate) },
]
const ZOOM_COLUMNS = [
  { key: 'zooms', label: 'zooms', value: (r, l) => formatNumber(r.zooms, l) },
  { key: 'views', label: 'views', value: (r, l) => formatNumber(r.views.current, l) },
]

function Dimension({ rows, language }) {
  if (rows.length === 0) return <Empty message={text(language, 'noList')} />
  return (
    <table style={S.table}>
      <thead>
        <tr>
          <th style={S.cell} />
          <th style={S.num}>{text(language, 'views')}</th>
          <th style={S.num}>{text(language, 'asks')}</th>
          <th style={S.num}>{text(language, 'askRate')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <td style={S.cell}>{row.key}</td>
            <td style={S.num}>{formatNumber(row.views.current, language)}</td>
            <td style={S.num}>{formatNumber(row.asks, language)}</td>
            <td style={S.num}>{formatRate(row.askRate)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function AntiquesPanel({ data, language }) {
  const t = (key) => text(language, key)
  if (!data.hasData) {
    return (
      <Panel title={t('antiques')}>
        <Empty message={t('noEvents')} />
      </Panel>
    )
  }
  return (
    <Panel title={t('antiques')}>
      <div style={S.stats}>
        <Stat label={t('views')} value={data.views} language={language} />
        <Stat label={t('asks')} value={data.asks} language={language} />
      </div>
      <h3 style={S.h3}>{t('mostViewed')}</h3>
      <AntiqueTable rows={data.mostViewed} language={language} columns={VIEW_COLUMNS} />
      <h3 style={S.h3}>{t('mostZoomed')}</h3>
      <AntiqueTable rows={data.mostZoomed} language={language} columns={ZOOM_COLUMNS} />
      <h3 style={S.h3}>{t('byType')}</h3>
      <Dimension rows={data.byType} language={language} />
      <h3 style={S.h3}>{t('byMaker')}</h3>
      <Dimension rows={data.byMaker} language={language} />
      <h3 style={S.h3}>{t('byPlace')}</h3>
      <Dimension rows={data.byPlace} language={language} />
    </Panel>
  )
}
