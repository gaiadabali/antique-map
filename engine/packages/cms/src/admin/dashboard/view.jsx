/**
 * The owner's dashboard at `/admin/dashboard` (ANALYTICS.md §8; TASKS.md 9.2.b): one tab per site,
 * a period picker, and the panels. A Payload custom view, server-rendered; the site and the period
 * are search params, so every tab and every period is a plain link (no client state, no prefetch).
 *
 * Owner-only (DR-10). Custom views are reachable without a session, so this view checks for
 * itself: nobody signed in goes to the login; an editor or a store user gets the panel-less state
 * — one sentence, no number, no hint of what the panels hold. The loaders check again
 * (`DashboardForbidden`), and read through the Local API as the acting user.
 *
 * `.jsx` for the reason `../widgets/dashboard.jsx` gives; `view.d.ts` types the export.
 */
import { redirect } from 'next/navigation'

import { hasRole } from '../../collections/users/roles'

import { fill, text } from './copy'
import { DashboardForbidden, isSite } from './context'
import { loadDashboard } from './loaders'
import { AsksPanel, ChatPanel } from './panels-business'
import {
  FulfilmentPanel,
  FunnelPanel,
  PaymentsPanel,
  SalesPanel,
  VitalsPanel,
} from './panels-shop'
import { AntiquesPanel, SearchPanel, VisitorsPanel } from './panels-traffic'
import { resolvePeriod } from './period'
import { Empty, S } from './ui'

const first = (value) => (Array.isArray(value) ? value[0] : value)

function href(site, query) {
  const parts = [`site=${site}`]
  for (const key of ['period', 'from', 'to']) {
    if (query[key]) parts.push(`${key}=${encodeURIComponent(query[key])}`)
  }
  return `?${parts.join('&')}`
}

function Frame({ language, adminRoute, children }) {
  return (
    <main style={S.page}>
      <p style={S.muted}>
        <a href={adminRoute}>← {text(language, 'back')}</a>
      </p>
      <h1 style={{ margin: 0 }}>{text(language, 'title')}</h1>
      {children}
    </main>
  )
}

/** Tabs (one per site) and the period picker. */
function Controls({ language, site, period, query }) {
  const t = (key) => text(language, key)
  const presets = [
    [7, 'last7'],
    [30, 'last30'],
    [90, 'last90'],
  ]
  return (
    <nav aria-label={t('periodLabel')} style={{ marginBlockStart: 'var(--base)' }}>
      <div style={S.row}>
        {[
          ['gallery', 'siteGallery'],
          ['shop', 'siteShop'],
        ].map(([value, key]) => (
          <a
            key={value}
            href={href(value, query)}
            aria-current={value === site ? 'page' : undefined}
            style={{ ...S.tab, ...(value === site ? S.tabOn : {}) }}
          >
            {t(key)}
          </a>
        ))}
      </div>
      <div style={{ ...S.row, marginBlockStart: 'calc(var(--base) / 2)' }}>
        {presets.map(([days, key]) => (
          <a
            key={days}
            href={`?site=${site}&period=${days}`}
            aria-current={period.preset === days ? 'true' : undefined}
            style={{ ...S.tab, ...(period.preset === days ? S.tabOn : {}) }}
          >
            {t(key)}
          </a>
        ))}
        <form method="get" style={S.row}>
          <input type="hidden" name="site" value={site} />
          <label>
            {t('rangeFrom')}{' '}
            <input type="date" name="from" defaultValue={period.from} max={period.to} />
          </label>
          <label>
            {t('rangeTo')} <input type="date" name="to" defaultValue={period.to} />
          </label>
          <button type="submit" className="btn btn--style-secondary btn--size-small">
            {t('rangeApply')}
          </button>
        </form>
      </div>
      <p style={S.muted}>
        {period.from} → {period.to}.{' '}
        {fill(language, 'comparing', {
          days: period.days,
          from: period.previous.from,
          to: period.previous.to,
        })}
      </p>
    </nav>
  )
}

function Panels({ data, language }) {
  const gallery = data.site === 'gallery'
  return (
    <div style={S.grid}>
      <VisitorsPanel data={data.visitors} language={language} />
      {gallery ? <SearchPanel data={data.search} language={language} /> : null}
      {gallery ? <AntiquesPanel data={data.antiques} language={language} /> : null}
      <AsksPanel
        data={data.asks}
        language={language}
        title={text(language, gallery ? 'asksAndSells' : 'taps')}
      />
      <ChatPanel data={data.chat} language={language} />
      {gallery ? null : <FunnelPanel data={data.funnel} language={language} />}
      {gallery ? null : <SalesPanel data={data.sales} language={language} />}
      {gallery ? null : <FulfilmentPanel data={data.fulfilment} language={language} />}
      {gallery ? null : <PaymentsPanel data={data.payments} language={language} />}
      {gallery ? null : <VitalsPanel data={data.vitals} language={language} />}
    </div>
  )
}

export async function DashboardView({ initPageResult, searchParams }) {
  const req = initPageResult?.req
  const language = req?.i18n?.language
  const adminRoute = req?.payload?.config?.routes?.admin ?? '/admin'
  if (!req?.user) {
    redirect(`${adminRoute}/login?redirect=${encodeURIComponent(`${adminRoute}/dashboard`)}`)
  }
  if (!hasRole(req.user, 'owner')) {
    return (
      <Frame language={language} adminRoute={adminRoute}>
        <Empty message={text(language, 'panelLess')} />
      </Frame>
    )
  }

  const query = {
    site: first(searchParams?.site),
    period: first(searchParams?.period),
    from: first(searchParams?.from),
    to: first(searchParams?.to),
  }
  const site = isSite(query.site) ? query.site : 'gallery'
  const period = resolvePeriod(query)
  let data = null
  let failed = false
  try {
    data = await loadDashboard(req.payload, req.user, { site, period })
  } catch (error) {
    if (error instanceof DashboardForbidden) {
      return (
        <Frame language={language} adminRoute={adminRoute}>
          <Empty message={text(language, 'panelLess')} />
        </Frame>
      )
    }
    failed = true
    req.payload.logger?.error?.({ err: error }, 'the dashboard could not be loaded')
  }
  return (
    <Frame language={language} adminRoute={adminRoute}>
      <p style={S.muted}>{text(language, 'intro')}</p>
      <Controls language={language} site={site} period={period} query={query} />
      {failed ? (
        <Empty message={text(language, 'loadFailed')} />
      ) : (
        <Panels data={data} language={language} />
      )}
    </Frame>
  )
}
