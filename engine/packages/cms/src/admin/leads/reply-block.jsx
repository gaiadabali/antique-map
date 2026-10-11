/**
 * "Reply on WhatsApp" and "Reply by email" — the lead edit view's first block (TASKS.md 10.8.b;
 * CONTENT-OPERATIONS.md §4.1 step 3). A UI field's server component: Payload gives it the form's
 * data; the first item the person asked about is read for its title, so the opening line can name
 * it. Plain links, no client JS. `.jsx`: see `./shared.jsx`'s header.
 */
import { buildReply } from './reply'
import { Card, L } from './shared'

async function firstItemTitle(payload, req, data, locale) {
  const first = Array.isArray(data?.items) ? data.items[0] : undefined
  const id = typeof first === 'object' ? first?.id : first
  if (id === undefined || id === null) return null
  try {
    const work = await payload.findByID({
      collection: 'works',
      id,
      depth: 0,
      locale,
      fallbackLocale: 'en',
      overrideAccess: false,
      user: req.user,
      req,
      select: { title: true },
    })
    return typeof work?.title === 'string' ? work.title : null
  } catch {
    return null
  }
}

export async function LeadReplyBlock({ data, id, payload, req, i18n }) {
  const adminLanguage = i18n?.language === 'id' ? 'id' : 'en'
  // Only a saved lead has anything to reply to.
  if (!id && !data?.id) return null
  const language = data?.payload?.locale === 'id' ? 'id' : 'en'
  const title = await firstItemTitle(payload, req, data, language)
  const reply = buildReply(data, title)
  return (
    <Card>
      <h4 className="ix-card__title">{L('replyTitle', adminLanguage)}</h4>
      <div className="ix-actions">
        {reply.whatsapp ? (
          <a
            href={reply.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="ix-btn ix-btn--primary"
          >
            {L('replyWhatsapp', adminLanguage)}
          </a>
        ) : null}
        {reply.mailto ? (
          <a href={reply.mailto} className="ix-btn ix-btn--quiet">
            {L('replyEmail', adminLanguage)}
          </a>
        ) : null}
      </div>
      {!reply.whatsapp && !reply.mailto ? (
        <p className="ix-muted">{L('replyNoContact', adminLanguage)}</p>
      ) : (
        <p className="ix-muted">{L('replyHint', adminLanguage)}</p>
      )}
    </Card>
  )
}
