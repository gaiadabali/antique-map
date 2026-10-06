/**
 * The item page's record (5.2.b; EXPERIENCE-GALLERY.md §5): a definition list in the order
 * collectors expect — type, maker, place, date, technique, colouring, dimensions, condition,
 * references, provenance, subjects, stock number. A field with no value is left out, never
 * shown as "—". The labels are the app lexicon's `record.*`; a vocabulary value is said in the
 * page's words (`objectType.*`, `technique.*`, `colouring.*`, `maker.*`).
 */
import type { SiteLocale } from '@engine/config/sites'

import type { ItemView } from '../../../server/gallery/item/view-model'
import { Eyebrow } from '../../../shared/ui'
import { creditLine, itemText, type ItemText } from './copy'
import styles from './item.module.css'

function Row({ term, children }: { readonly term: string; readonly children: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <dt className={styles.term}>{term}</dt>
      <dd className={styles.detail}>{children}</dd>
    </div>
  )
}

function Lines({ lines }: { readonly lines: readonly string[] }) {
  return lines.map((line, at) => (
    <p key={at} className={styles.provenanceRow}>
      {line}
    </p>
  ))
}

function ConditionRow({ work, t }: { readonly work: ItemView; readonly t: ItemText }) {
  const notes = [
    work.conditionGrade,
    work.conditionNotes,
    work.conditionDefects.length > 0
      ? `${t('record.condition.defects')}: ${work.conditionDefects.join('; ')}`
      : null,
    work.conditionRestoration !== null
      ? `${t('record.condition.restoration')}: ${work.conditionRestoration}`
      : null,
  ].filter((line): line is string => line !== null && line !== '')
  if (notes.length === 0) return null
  return (
    <Row term={t('record.condition')}>
      <Lines lines={notes} />
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
  const provenance = work.provenance.map((row) =>
    [row.holder, row.period, row.note].filter((part): part is string => part !== null).join(', '),
  )
  const references = work.references.map((row) =>
    row.note !== null ? `${row.citation} — ${row.note}` : row.citation,
  )
  return (
    <section className={styles.record} aria-labelledby="item-record">
      <Eyebrow>
        <span id="item-record">{t('item.record')}</span>
      </Eyebrow>
      <dl className={styles.list}>
        {work.objectType !== null && (
          <Row term={t('record.objectType')}>{t.code('objectType', work.objectType)}</Row>
        )}
        {work.maker !== null && <Row term={t('item.maker')}>{creditLine(t, work.maker)}</Row>}
        {work.places.length > 0 && (
          <Row term={t('item.place')}>{work.places.map((place) => place.name).join(', ')}</Row>
        )}
        {work.date !== null && <Row term={t('record.date')}>{work.date}</Row>}
        {work.technique !== null && (
          <Row term={t('record.technique')}>{t.code('technique', work.technique)}</Row>
        )}
        {work.colouring !== null && (
          <Row term={t('record.colour')}>{t.code('colouring', work.colouring)}</Row>
        )}
        {work.dimensions !== null && <Row term={t('record.dimensions')}>{work.dimensions}</Row>}
        <ConditionRow work={work} t={t} />
        {references.length > 0 && (
          <Row term={t('record.references')}>
            <Lines lines={references} />
          </Row>
        )}
        {provenance.length > 0 && (
          <Row term={t('record.provenance')}>
            <Lines lines={provenance} />
          </Row>
        )}
        {work.subjects.length > 0 && (
          <Row term={t('item.subjects')}>{work.subjects.join(', ')}</Row>
        )}
      </dl>
    </section>
  )
}
