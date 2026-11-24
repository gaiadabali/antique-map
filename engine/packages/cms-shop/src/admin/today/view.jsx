/**
 * The shop's "Today", the admin's home (TASKS.md 27.6.a; the plan's §3.1): the orders to act on by
 * where they stand, the low stock, the drafts, the new leads and the last seven days' sales — each
 * card a link to its work (the inbox tab, the stock matrix's low-stock filter, the drafts list, the
 * leads inbox, the numbers). Payload renders a replaced dashboard (`views.dashboard`) inside its
 * own frame, so this is the main column only, in the admin's own `ix-*` look (`./today.css`).
 *
 * Store staff never see it: their home is their orders, a server redirect before anything renders
 * (as the wall did, TASKS.md 10.8.c). Every number is the person's own reads (`./data.ts`).
 * `.jsx`: see `../leads/shared.jsx`'s header.
 */
import { hasRole } from '@engine/cms-core/access'
import { redirect } from 'next/navigation'

import { formatNumber, formatRupiah } from '@engine/cms-core/admin/dashboard/format'
import { filterHref } from '../products/list-filters'
import { tt } from './copy'
import { ACTING_TABS, loadToday } from './data'
import { TodayStyles } from './styles-client'

/** Store staff's home: their orders (TASKS.md 10.8.c, 27.6.b). */
export const STORE_HOME = '/admin/orders'

/**
 * Whether this admin has the custom view `name`: today's one admin has the wall, the leads inbox
 * and the owner's dashboard; the shop's own admin has not (yet), so its cards open the leads' list
 * and the orders instead, and the wall's link is left out.
 */
const hasView = (payload, name) => Boolean(payload?.config?.admin?.components?.views?.[name])

const DRAFT_PAGES = '/admin/collections/pages?where[_status][equals]=draft'

function Card({ href, count, label, note, language, tone }) {
  const known = count !== null && count !== undefined
  return (
    <li>
      <a
        className={`today-card${tone && known && count > 0 ? ` today-card--${tone}` : ''}`}
        href={href}
      >
        <span className="today-card__count">
          {known ? (typeof count === 'number' ? formatNumber(count, language) : count) : '—'}
        </span>
        <span className="today-card__label">{label}</span>
        {note ? <span className="today-card__note">{note}</span> : null}
        {!known ? <span className="today-card__note">{tt('unknown', language)}</span> : null}
      </a>
    </li>
  )
}

function Section({ id, title, children }) {
  return (
    <section className="today-section" aria-labelledby={id}>
      <h2 className="ix-panel__title" id={id}>
        {title}
      </h2>
      <ul className="today-grid">{children}</ul>
    </section>
  )
}

export async function TodayView(props) {
  const result = props.initPageResult
  const req = result?.req
  const user = req?.user ?? props.user
  if (hasRole(user, 'store')) redirect(STORE_HOME)
  if (!req?.payload) return null
  const language = req.i18n?.language === 'id' ? 'id' : 'en'

  return (
    <main className="ix-page ix-page--wide today">
      <TodayStyles />
      <h1 className="ix-title">{tt('title', language)}</h1>
      <p className="ix-muted ix-intro">{tt('intro', language)}</p>
      {await TodaySections({ payload: req.payload, user, language })}
      {hasView(req.payload, 'catalogue-wall') ? (
        <p className="today-more">
          <a className="ix-link" href="/admin/wall">
            {tt('wall', language)}
          </a>
        </p>
      ) : null}
    </main>
  )
}

/**
 * Today's cards alone — the orders to act on, the stock and drafts, the owner's leads and sales —
 * for this page and for the top of the admin's home (`../home/view.jsx`). The caller wraps them in
 * an element with the `today` class (`./today.css` is scoped by it) and renders `TodayStyles`.
 */
export async function TodaySections({ payload, user, language }) {
  const today = await loadToday({ payload, user })
  const owner = hasRole(user, 'owner')

  return (
    <>
      <Section id="today-orders" title={tt('ordersTitle', language)}>
        {ACTING_TABS.map((tab) => (
          <Card
            key={tab}
            href={`/admin/orders?tab=${tab}`}
            count={today.orders[tab]}
            label={tt(`tab_${tab}`, language)}
            tone={tab === 'needs_action' ? 'act' : undefined}
            language={language}
          />
        ))}
      </Section>

      <Section id="today-catalogue" title={tt('catalogueTitle', language)}>
        {today.lowStock ? (
          <Card
            href="/admin/stock?low=1"
            count={today.lowStock.rows}
            label={tt('lowStock', language, { n: today.lowStock.threshold })}
            tone="act"
            language={language}
          />
        ) : null}
        {today.drafts ? (
          <>
            <Card
              href={filterHref({ kind: 'drafts' })}
              count={today.drafts.products}
              label={tt('draftProducts', language)}
              language={language}
            />
            <Card
              href={DRAFT_PAGES}
              count={today.drafts.pages}
              label={tt('draftPages', language)}
              language={language}
            />
          </>
        ) : null}
      </Section>

      {owner ? (
        <Section id="today-people" title={tt('peopleTitle', language)}>
          <Card
            href={
              hasView(payload, 'leads-inbox')
                ? '/admin/leads'
                : '/admin/collections/leads?where[status][equals]=new'
            }
            count={today.leads}
            label={tt('newLeads', language)}
            tone="act"
            language={language}
          />
          <Card
            href={hasView(payload, 'ownerDashboard') ? '/admin/dashboard' : '/admin/orders'}
            count={today.sales ? formatRupiah(today.sales.revenue) : null}
            label={tt('sales', language)}
            note={
              today.sales
                ? today.sales.orders === 1
                  ? tt('salesOrder', language)
                  : tt('salesOrders', language, { n: formatNumber(today.sales.orders, language) })
                : undefined
            }
            language={language}
          />
        </Section>
      ) : null}
    </>
  )
}

/** Today's cards with their stylesheet, for the top of the admin's home (`@engine/cms-core/admin/home`). */
export async function TodayTop({ payload, user, language }) {
  return (
    <>
      <TodayStyles />
      {await TodaySections({ payload, user, language })}
    </>
  )
}
