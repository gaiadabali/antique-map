/**
 * The orders inbox (TASKS.md 27.3.a; the plan §3.7): one door for every order — tabs by where it
 * stands, each with its count, a search by buyer, number or phone that every tab's count follows,
 * and the list. Plain links and one GET form: no client JavaScript on the critical path, so a
 * store user's phone needs nothing but the page. A store user's tabs and counts are their store's
 * alone (`./inbox-data`, the collection's access). `.jsx`: see `./shared.jsx`'s header.
 */
import { ORDER_STATUS_LABELS } from '../../collections/orders/statuses'
import { INBOX_TABS } from './inbox'
import { L, QuietLink, StatusTag, SubmitButton, rupiah } from './shared'

/** The inbox's own address with `changes` applied, keeping the rest. */
export function inboxHref(query, changes = {}) {
  const next = { ...query, ...changes }
  const pairs = [
    ['tab', next.tab === 'needs_action' ? '' : next.tab],
    ['q', next.q],
    ['store', next.store ? String(next.store) : ''],
    ['page', next.page > 1 ? String(next.page) : ''],
  ].filter(([, value]) => value)
  const qs = pairs.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')
  return qs ? `/admin/orders?${qs}` : '/admin/orders'
}

/** "14:30, 5 Nov" in Bali time (Asia/Makassar). */
export function baliTime(iso, language) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
    hour12: false,
    timeZone: 'Asia/Makassar',
  }).format(date)
}

function SearchBar({ query, stores, language }) {
  return (
    <form method="get" action="/admin/orders" className="od-search" role="search">
      {query.tab !== 'needs_action' && <input type="hidden" name="tab" value={query.tab} />}
      <label className="ix-label">
        {L('searchLabel', language)}
        <input
          type="search"
          name="q"
          defaultValue={query.q}
          placeholder={L('searchPlaceholder', language)}
          maxLength={80}
          className="ix-input"
        />
      </label>
      {stores && (
        <label className="ix-label">
          {L('store', language)}
          <select name="store" defaultValue={query.store ?? ''} className="ix-input">
            <option value="">{L('allStores', language)}</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <SubmitButton variant="quiet">{L('searchSubmit', language)}</SubmitButton>
      {(query.q || query.store) && (
        <QuietLink href={inboxHref({ tab: query.tab })}>{L('searchClear', language)}</QuietLink>
      )}
    </form>
  )
}

function Tabs({ query, counts, language }) {
  return (
    <nav className="od-tabs ix-tabs" aria-label={L('tabsLabel', language)}>
      {INBOX_TABS.map((tab) => (
        <a
          key={tab}
          href={inboxHref(query, { tab, page: 1 })}
          className="ix-tab"
          aria-current={tab === query.tab ? 'page' : undefined}
        >
          {L(`tab_${tab}`, language)}
          <span className="od-count">{counts[tab] ?? 0}</span>
        </a>
      ))}
    </nav>
  )
}

function Row({ order, language, showStore }) {
  return (
    <li>
      <a href={`/admin/orders/${order.id}`} className="ix-item ix-item--cols">
        <strong className="ix-order-no ix-item__no">#{order.number}</strong>
        <span className="ix-item__tag">
          {order.needsAttention?.flag && (
            <span className="ix-tag ix-tag--danger">{L('needsAttention', language)}</span>
          )}
          <StatusTag status={order.status}>
            {ORDER_STATUS_LABELS[order.status]?.[language]}
          </StatusTag>
        </span>
        <span className="ix-item__meta">
          <span className="ix-item__who">{order.contact?.name}</span>
          {showStore && <span className="ix-item__store">{order.storeSnapshot?.name ?? '—'}</span>}
          <span className="ix-item__total">{rupiah(order.totals?.total)}</span>
        </span>
      </a>
    </li>
  )
}

export function Inbox({ inbox, query, stores, showStore, language }) {
  const label = L('pageOf', language)
    .replace('{page}', inbox.page)
    .replace('{total}', inbox.totalPages)
  return (
    <main className="ix-page ix-page--wide">
      <h1 className="ix-title">{L('inboxTitle', language)}</h1>
      <SearchBar query={query} stores={stores} language={language} />
      <Tabs query={query} counts={inbox.counts} language={language} />
      {query.q && (
        <p className="ix-muted" role="status">
          {L('searchResults', language).replace('{q}', query.q)}
        </p>
      )}
      {inbox.rows.length === 0 ? (
        <p className="ix-empty">{L('emptyTab', language)}</p>
      ) : (
        <ul className="ix-list">
          {inbox.rows.map((order) => (
            <Row key={order.id} order={order} language={language} showStore={showStore} />
          ))}
        </ul>
      )}
      {inbox.totalPages > 1 && (
        <div className="ix-pager">
          {inbox.page > 1 ? (
            <QuietLink href={inboxHref(query, { page: inbox.page - 1 })}>
              {L('pagePrev', language)}
            </QuietLink>
          ) : (
            <span />
          )}
          <span className="ix-muted">{label}</span>
          {inbox.page < inbox.totalPages ? (
            <QuietLink href={inboxHref(query, { page: inbox.page + 1 })}>
              {L('pageNext', language)}
            </QuietLink>
          ) : (
            <span />
          )}
        </div>
      )}
    </main>
  )
}
