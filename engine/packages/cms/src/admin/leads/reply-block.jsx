/**
 * "Reply on WhatsApp" and "Reply by email" — the lead edit view's first block (TASKS.md 10.8.b;
 * CONTENT-OPERATIONS.md §4.1 step 3). A UI field's server component: Payload gives it the form's
 * data; the first item the person asked about is read for its title, so the opening line can name
 * it. Plain links, no client JS. `.jsx`: see `./shared.jsx`'s header.
 */
import { buildReply } from './reply'
import { Card, L } from './shared'

const link = {
  display: 'inline-block',
  padding: '10px 16px',
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  minHeight: 40,
  textDecoration: 'none',
  background: 'var(--theme-success-500)',
  color: 'var(--theme-base-0)',
}

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
      <h4 style={{ marginTop: 0 }}>{L('replyTitle', adminLanguage)}</h4>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {reply.whatsapp ? (
          <a href={reply.whatsapp} target="_blank" rel="noopener noreferrer" style={link}>
            {L('replyWhatsapp', adminLanguage)}
          </a>
        ) : null}
        {reply.mailto ? (
          <a href={reply.mailto} style={link}>
            {L('replyEmail', adminLanguage)}
          </a>
        ) : null}
      </div>
      {!reply.whatsapp && !reply.mailto ? (
        <p style={{ margin: 0, color: 'var(--theme-elevation-600)' }}>
          {L('replyNoContact', adminLanguage)}
        </p>
      ) : (
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--theme-elevation-600)' }}>
          {L('replyHint', adminLanguage)}
        </p>
      )}
    </Card>
  )
}
