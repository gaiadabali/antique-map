/**
 * The owner's leads inbox (TASKS.md 9.1.a; CONTENT-OPERATIONS.md §4.1), registered at `/leads`
 * (`./entry.ts`, `../../registries/views.ts`): newest first, defaulting to status New, filterable
 * by site, kind and status. Owner only — anyone else gets Payload's unauthorised state, never
 * data; access still refuses the query itself (`loadInboxLeads` reads with `overrideAccess: false`,
 * so this check is belt and braces, not the only guard). The page frame is `./inbox.jsx`'s, so a test can call this without loading Payload's templates. `.jsx`: see `./shared.jsx`'s header.
 */
import {
  LEAD_KIND_LABELS,
  LEAD_KINDS,
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
} from '../../collections/leads/kinds'
import { roleOf } from '../../collections/users/roles'
import { firstLine, loadInboxLeads, loadStatusCounts, timeAgo } from './data'
import { Card, L, Notice, QuietLink, str } from './shared'

function FilterBar({ filter, counts, language }) {
  return (
    <form method="get" action="/admin/leads" className="ix-filter">
      <label className="ix-label">
        {L('filterSite', language)}
        <select name="site" defaultValue={filter.site} className="ix-input">
          <option value="">{L('filterAll', language)}</option>
          <option value="gallery">Gallery</option>
          <option value="shop">Shop</option>
        </select>
      </label>
      <label className="ix-label">
        {L('filterKind', language)}
        <select name="kind" defaultValue={filter.kind} className="ix-input">
          <option value="">{L('filterAll', language)}</option>
          {LEAD_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {LEAD_KIND_LABELS[kind][language]}
            </option>
          ))}
        </select>
      </label>
      <label className="ix-label">
        {L('filterStatus', language)}
        <select name="status" defaultValue={filter.status || 'new'} className="ix-input">
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {LEAD_STATUS_LABELS[status][language]} ({counts[status] ?? 0})
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="ix-btn ix-btn--quiet">
        {L('filterApply', language)}
      </button>
    </form>
  )
}

const STATUS_TONE = { new: 'warning', closed: 'success', spam: 'danger' }

function Row({ lead, language }) {
  const name = lead.payload?.name || '—'
  const channel = lead.payload?.preferredChannel || '—'
  const message = firstLine(lead.payload?.message)
  return (
    <a href={`/admin/collections/leads/${lead.id}`} className="ix-cardlink">
      <Card>
        <div className="ix-row">
          <strong className="ix-order-no">
            {LEAD_KIND_LABELS[lead.kind]?.[language] ?? lead.kind} · {lead.site}
          </strong>
          <span className={`ix-tag ix-tag--${STATUS_TONE[lead.status] ?? 'neutral'}`}>
            {LEAD_STATUS_LABELS[lead.status]?.[language] ?? lead.status}
          </span>
        </div>
        <div className="ix-muted">
          {name} · {channel} · {timeAgo(lead.createdAt, language)}
        </div>
        {message && <div className="ix-excerpt">{message}</div>}
        {!message && <div className="ix-excerpt ix-excerpt--none">{L('noMessage', language)}</div>}
      </Card>
    </a>
  )
}

function Pager({ page, totalPages, searchParams, language }) {
  if (totalPages <= 1) return null
  const query = (p) => {
    const pairs = [
      ['site', str(searchParams.site)],
      ['kind', str(searchParams.kind)],
      ['status', str(searchParams.status)],
      ['page', String(p)],
    ].filter(([, value]) => value)
    const qs = pairs.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')
    return `/admin/leads?${qs}`
  }
  return (
    <div className="ix-pager">
      {page > 1 ? (
        <QuietLink href={query(page - 1)}>{L('pagePrev', language)}</QuietLink>
      ) : (
        <span />
      )}
      <span className="ix-muted">
        {L('pageOf', language)} {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <QuietLink href={query(page + 1)}>{L('pageNext', language)}</QuietLink>
      ) : (
        <span />
      )}
    </div>
  )
}

export async function LeadsInboxViewBody(props) {
  const req = props.initPageResult?.req
  const language = props.i18n?.language === 'id' ? 'id' : 'en'
  const role = roleOf(req?.user)
  if (role !== 'owner') return <Notice tone="error">{L('refusalNotOwner', language)}</Notice>

  const payload = props.payload
  const searchParams = props.searchParams ?? {}
  const filter = {
    site: str(searchParams.site),
    kind: str(searchParams.kind),
    status: str(searchParams.status),
    page: Number(str(searchParams.page)) || 1,
  }
  const [{ docs, totalPages, page }, counts] = await Promise.all([
    loadInboxLeads(payload, req, filter),
    loadStatusCounts(payload, req, filter),
  ])

  return (
    <div className="ix-page">
      <h1 className="ix-title">{L('inboxTitle', language)}</h1>
      <FilterBar filter={filter} counts={counts} language={language} />
      {docs.length === 0 ? (
        <p className="ix-empty">{L('emptyList', language)}</p>
      ) : (
        <div>
          {docs.map((lead) => (
            <Row key={lead.id} lead={lead} language={language} />
          ))}
        </div>
      )}
      <Pager page={page} totalPages={totalPages} searchParams={searchParams} language={language} />
    </div>
  )
}
