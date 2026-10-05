/**
 * The item page's record (5.2.b; EXPERIENCE-GALLERY.md §5): a definition list in the order
 * collectors expect — type, maker, place, date, technique, colouring, dimensions, condition,
 * references, provenance, subjects, stock number. A field with no value is left out, never
 * shown as "—".
 */
import type { SiteLocale } from '@engine/config/sites'

import type { ItemView } from '../../../server/gallery/item/view-model'
import { Eyebrow } from '../../../shared/ui'
import { itemText, type ItemText } from './copy'
import styles from './item.module.css'

function Row({ term, children }: { readonly term: string; readonly children: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <dt className={styles.term}>{term}</dt>
      <dd className={styles.detail}>{children}</dd>
    </div>
  )
}

function conditionRows(work: ItemView, t: ItemText): React.ReactNode {
  const notes = [
    work.conditionNotes,
    work.conditionDefects.length > 0 ? work.conditionDefects.join('; ') : null,
    work.conditionRestoration,
  ].filter((line): line is string => line !== null && line !== '')
  if (work.conditionGrade === null && notes.length === 0) return null
  return (
    <Row term={t('item.condition')}>
      {work.conditionGrade}
      {work.conditionGrade !== null && notes.length > 0 ? ' — ' : ''}
      {notes.join(' — ')}
    </Row>
  )
}

/** The record's rows, present fields only. */
export function ItemRecord({
  work,
  locale,
}: {
  readonly work: ItemView
  readonly locale: SiteLocale
}): React.ReactElement {
  const t = itemText(locale)
  const provenance = work.provenance.map((row, at) => (
    <p key={at} className={styles.provenanceRow}>
      {row.period !== null && row.note !== null
        ? t('item.provenanceNote', { holder: row.holder, period: row.period, note: row.note })
        : row.period !== null
          ? `${row.holder}, ${row.period}.`
          : row.note !== null
            ? `${row.holder}. ${row.note}`
            : row.holder}
    </p>
  ))
  return (
    <section className={styles.record} aria-label={t('item.objectType')}>
      <Eyebrow>{t('item.objectType')}</Eyebrow>
      <dl className={styles.list}>
        {work.objectType !== null && <Row term={t('item.objectType')}>{work.objectType}</Row>}
        {work.maker !== null && (
          <Row term={t('item.maker')}>
            {work.maker.name}
            {work.maker.role !== '' ? ` (${work.maker.role})` : ''}
            {work.maker.certainty !== '' && work.maker.certainty !== 'certain'
              ? `, ${work.maker.certainty}`
              : ''}
          </Row>
        )}
        {work.places.length > 0 && (
          <Row term={t('item.place')}>{work.places.map((place) => place.name).join(', ')}</Row>
        )}
        {work.date !== null && <Row term={t('item.date')}>{work.date}</Row>}
        {work.technique !== null && <Row term={t('item.technique')}>{work.technique}</Row>}
        {work.colouring !== null && <Row term={t('item.colouring')}>{work.colouring}</Row>}
        {work.dimensions !== null && <Row term={t('item.dimensions')}>{work.dimensions}</Row>}
        {conditionRows(work, t)}
        {work.references.length > 0 && (
          <Row term={t('item.references')}>
            {work.references.map((row, at) => (
              <p key={at} className={styles.provenanceRow}>
                {row.note !== null ? `${row.citation} — ${row.note}` : row.citation}
              </p>
            ))}
          </Row>
        )}
        {provenance.length > 0 && <Row term={t('item.provenance')}>{provenance}</Row>}
        {work.subjects.length > 0 && (
          <Row term={t('item.subjects')}>{work.subjects.join(', ')}</Row>
        )}
        {work.stockNumber !== null && (
          <Row term={t('item.stockNumber')}>{work.stockNumber}</Row>
        )}
      </dl>
    </section>
  )
}
