/**
 * "Open the source" — the lead edit view's sidebar block (TASKS.md 9.1.b): links to the items
 * (works) the person asked about and the chat session that handed them off, each to its own
 * admin edit page. A UI field's server component: Payload gives it the sibling data already in
 * the form (`data`), `payload` and `req` to read further. `.jsx`: see `./shared.jsx`'s header.
 */
import { L } from './shared'

async function loadItems(payload, req, ids) {
  if (!Array.isArray(ids) || ids.length === 0) return []
  const result = await payload.find({
    collection: 'works',
    depth: 0,
    limit: ids.length,
    overrideAccess: false,
    user: req.user,
    req,
    select: { title: true, stockNumber: true },
    where: { id: { in: ids.map((item) => (typeof item === 'object' ? item?.id : item)) } },
  })
  return result.docs
}

export async function LeadSourceBlock({ data, payload, req, i18n }) {
  const language = i18n?.language === 'id' ? 'id' : 'en'
  const itemIds = Array.isArray(data?.items) ? data.items : []
  const chatSession = data?.chatSession
  const chatSessionId = typeof chatSession === 'object' ? chatSession?.id : chatSession
  const items = await loadItems(payload, req, itemIds)

  if (items.length === 0 && !chatSessionId) {
    return (
      <div className="ix-block">
        <h4 className="ix-block__title">{L('sourceTitle', language)}</h4>
        <p className="ix-muted">{L('sourceNone', language)}</p>
      </div>
    )
  }

  return (
    <div className="ix-block">
      <h4 className="ix-block__title">{L('sourceTitle', language)}</h4>
      {items.length > 0 && (
        <div className="ix-block__group">
          <div className="ix-label">{L('sourceItemsLabel', language)}</div>
          {items.map((item) => (
            <div key={item.id}>
              <a href={`/admin/collections/works/${item.id}`} className="ix-link ix-link--inline">
                {item.stockNumber ? `${item.stockNumber} — ` : ''}
                {item.title ?? L('sourceAdminPage', language)}
              </a>
            </div>
          ))}
        </div>
      )}
      {chatSessionId && (
        <div>
          <a
            href={`/admin/collections/chat-sessions/${chatSessionId}`}
            className="ix-link ix-link--inline"
          >
            {L('sourceChatLabel', language)}
          </a>
        </div>
      )}
    </div>
  )
}
