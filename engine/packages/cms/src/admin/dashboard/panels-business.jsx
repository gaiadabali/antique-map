/**
 * The business panels: Asks and sells, Chat, and the shop's "run 2" stubs (ANALYTICS.md §8).
 * Leads, replies and chats are counted from their records, so a panel here shows them apart from
 * the beacon's taps, never added to them.
 */
import { text, word } from './copy'
import { formatNumber } from './format'
import { Empty, Panel, Ranked, Stat } from './ui'

export function AsksPanel({ data, language, title }) {
  const t = (key) => text(language, key)
  const heading = title ?? t('asksAndSells')
  if (!data.hasData) {
    return (
      <Panel title={heading}>
        <Empty message={t('noEvents')} />
      </Panel>
    )
  }
  const { replies } = data
  const word_ = (key) => word(language, key)
  return (
    <Panel title={heading} note={t('tapsNote')}>
      <div className="ix-stats">
        <Stat label={t('taps')} value={data.taps} language={language} />
        <Stat label={t('leads')} value={data.leads} language={language} />
      </div>
      <h3 className="ix-h3">{t('byChannel')}</h3>
      <Ranked rows={data.byChannel} language={language} label={word_} />
      <h3 className="ix-h3">{t('byContext')}</h3>
      <Ranked rows={data.byContext} language={language} label={word_} />
      <h3 className="ix-h3">{t('leadsByKind')}</h3>
      <Ranked
        rows={data.leadsByKind.map((k) => ({
          key: k.kind,
          current: k.leads.current,
          previous: k.leads.previous,
        }))}
        language={language}
        label={word_}
      />
      <h3 className="ix-h3">{t('replies')}</h3>
      <p className="ix-muted">{t('repliesNote')}</p>
      <table className="ix-table">
        <tbody>
          <tr>
            <td className="ix-cell">{t('answeredInTime')}</td>
            <td className="ix-cell ix-cell--num">{formatNumber(replies.inTime, language)}</td>
          </tr>
          <tr>
            <td className="ix-cell">{t('answeredLate')}</td>
            <td className="ix-cell ix-cell--num">{formatNumber(replies.late, language)}</td>
          </tr>
          <tr>
            <td className="ix-cell">{t('overdue')}</td>
            <td className="ix-cell ix-cell--num">{formatNumber(replies.overdue, language)}</td>
          </tr>
          <tr>
            <td className="ix-cell">{t('stillOpen')}</td>
            <td className="ix-cell ix-cell--num">{formatNumber(replies.open, language)}</td>
          </tr>
          <tr>
            <td className="ix-cell">{t('medianHours')}</td>
            <td className="ix-cell ix-cell--num">
              {replies.medianHours === null ? '—' : formatNumber(replies.medianHours, language, 1)}
            </td>
          </tr>
        </tbody>
      </table>
      {replies.inTimePct ? (
        <div className="ix-stats">
          <Stat label={t('inTimeShare')} value={replies.inTimePct} language={language} digits={1} />
        </div>
      ) : null}
    </Panel>
  )
}

export function ChatPanel({ data, language }) {
  const t = (key) => text(language, key)
  if (!data.hasData) {
    return (
      <Panel title={t('chatPanel')}>
        <Empty message={t('noChats')} />
      </Panel>
    )
  }
  return (
    <Panel title={t('chatPanel')}>
      <div className="ix-stats">
        <Stat label={t('chatSessions')} value={data.sessions} language={language} />
        <Stat label={t('handoffs')} value={data.handoffs} language={language} />
        <Stat label={t('handoffRate')} value={data.handoffRate} language={language} digits={1} />
        <Stat label={t('leadsCaptured')} value={data.leadsCaptured} language={language} />
        <Stat label={t('refused')} value={data.refused} language={language} />
        <Stat label={t('blocked')} value={data.blocked} language={language} />
        <Stat label={t('aiCost')} value={data.costUsd} language={language} digits={2} />
      </div>
      <h3 className="ix-h3">{t('handoffChannels')}</h3>
      <Ranked
        rows={data.handoffsByChannel}
        language={language}
        label={(key) => word(language, key)}
      />
    </Panel>
  )
}
