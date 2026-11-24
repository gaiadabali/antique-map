/**
 * The stock matrix at `/admin/stock` (TASKS.md 27.4.b; the plan's §3.8): products × stores, found
 * by name or SKU, a count changed in its own box, a low-stock filter at the one global threshold,
 * 25 products a page. Any staff member: the owner and the editors see every open store (one
 * picked, or all), store staff their own store's column alone — because every read is theirs
 * (`./data`, `overrideAccess: false`) and every save goes through `stock-levels`' own access, not
 * because this screen hides anything. The search, the store and the filter are a plain GET form
 * and links, so a page is an address to share; the search box also narrows the list as the person
 * types (`./search-box`). `.jsx`: see `../leads/shared.jsx`'s header.
 */
import { hasRole, roleOf } from '@engine/cms-core/access'

import { Notice } from '@engine/cms-core/admin/shared'
import { AdminPage } from '@engine/cms-core/admin/page'
import { canStart } from '../products/stock-grid'
import { StockMatrixClient } from './client'
import { L } from './copy'
import { matrixData } from './data'
import { matrixHref, readQuery, STORES_PER_PAGE } from './grid'
import { SearchBox } from './search-box'

/** The view inside Payload's page frame (`../page.jsx`): the sidebar stays on every screen. */
export async function StockMatrixView(props) {
  return <AdminPage view={props}>{await StockMatrixBody(props)}</AdminPage>
}

function Search({ query, stores, language }) {
  return (
    <form method="get" action="/admin/stock" className="ix-filter" role="search">
      <div className="sm-search">
        <label htmlFor="sm-q" className="ix-label">
          {L('findLabel', language)}
        </label>
        <SearchBox query={query} placeholder={L('findPlaceholder', language)} />
      </div>
      {stores.length > 1 ? (
        <div>
          <label htmlFor="sm-store" className="ix-label">
            {L('storeLabel', language)}
          </label>
          <select id="sm-store" name="store" className="ix-input" defaultValue={query.store}>
            <option value="">{L('allStores', language)}</option>
            {stores.map((store) => (
              <option key={store.id} value={String(store.id)}>
                {`${store.name} (${store.code})`}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {query.low ? <input type="hidden" name="low" value="1" /> : null}
      <button type="submit" className="ix-btn ix-btn--primary">
        {L('find', language)}
      </button>
      {query.q || query.store ? (
        <a className="ix-link" href={matrixHref(query, { q: '', store: '' })}>
          {L('clear', language)}
        </a>
      ) : null}
    </form>
  )
}

function Filters({ query, threshold, language }) {
  return (
    <nav className="ix-tabs" aria-label={L('filtersLabel', language)}>
      <a
        className="ix-tab"
        href={matrixHref(query, { low: false })}
        aria-current={query.low ? undefined : 'page'}
      >
        {L('filterAll', language)}
      </a>
      <a
        className="ix-tab"
        href={matrixHref(query, { low: true })}
        aria-current={query.low ? 'page' : undefined}
      >
        {L('filterLow', language, { n: threshold })}
      </a>
    </nav>
  )
}

function Pager({ query, page, totalPages, language }) {
  if (totalPages <= 1) return null
  return (
    <nav className="ix-pager" aria-label={L('pageOf', language, { n: page, m: totalPages })}>
      {page > 1 ? (
        <a className="ix-link" href={matrixHref(query, { page: page - 1 })}>
          {L('pagePrev', language)}
        </a>
      ) : (
        <span />
      )}
      <span className="ix-muted">{L('pageOf', language, { n: page, m: totalPages })}</span>
      {page < totalPages ? (
        <a className="ix-link" href={matrixHref(query, { page: page + 1 })}>
          {L('pageNext', language)}
        </a>
      ) : (
        <span />
      )}
    </nav>
  )
}

/** The store columns' own pager, when every store is shown: ten columns a page. */
function StorePager({ query, pages, total, language }) {
  if (pages <= 1 || query.store) return null
  const cols = Math.min(query.cols, pages)
  const from = (cols - 1) * STORES_PER_PAGE + 1
  const to = Math.min(cols * STORES_PER_PAGE, total)
  const label = L('storesOf', language, { a: from, b: to, n: total })
  return (
    <nav className="ix-pager sm-store-pager" aria-label={label}>
      {cols > 1 ? (
        <a className="ix-link" href={matrixHref(query, { cols: cols - 1, page: query.page })}>
          {L('storesPrev', language)}
        </a>
      ) : (
        <span />
      )}
      <span className="ix-muted">{label}</span>
      {cols < pages ? (
        <a className="ix-link" href={matrixHref(query, { cols: cols + 1, page: query.page })}>
          {L('storesNext', language)}
        </a>
      ) : (
        <span />
      )}
    </nav>
  )
}

async function StockMatrixBody(props) {
  const req = props.initPageResult?.req
  const user = req?.user
  const language = props.i18n?.language === 'id' ? 'id' : 'en'
  if (!hasRole(user, 'owner', 'editor', 'store')) {
    return <Notice tone="error">{L('refusal', language)}</Notice>
  }
  const query = readQuery(props.searchParams ?? {})
  const data = await matrixData(req.payload, user, query, language)
  const count =
    data.totalProducts === 1
      ? L('foundOne', language)
      : L('found', language, { n: data.totalProducts })
  return (
    <main className="ix-page ix-page--wide">
      <h1 className="ix-title">{L('title', language)}</h1>
      <p className="ix-muted ix-intro">{L('intro', language)}</p>
      {data.allStores.length === 0 ? (
        <Notice tone="error">{L('noStores', language)}</Notice>
      ) : (
        <>
          <Search query={query} stores={data.allStores} language={language} />
          <Filters query={query} threshold={data.threshold} language={language} />
          <p className="ix-muted sm-count">{count}</p>
          <StorePager
            query={query}
            pages={data.storePages}
            total={data.allStores.length}
            language={language}
          />
          {data.lines.length === 0 ? (
            <p>
              {query.low ? L('noneLow', language, { n: data.threshold }) : L('noneFound', language)}
            </p>
          ) : (
            <StockMatrixClient
              // A new page or filter is a new table: no count typed on the last one carries over.
              key={matrixHref(query)}
              stores={data.stores}
              lines={data.lines}
              rows={data.rows}
              threshold={data.threshold}
              mayStart={canStart(roleOf(user))}
              language={language}
            />
          )}
          <Pager query={query} page={data.page} totalPages={data.totalPages} language={language} />
        </>
      )}
    </main>
  )
}
