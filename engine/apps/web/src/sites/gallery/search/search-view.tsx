/**
 * The search page's answer (5.1.b; EXPERIENCE-GALLERY.md §4, §9): the words as the heading, the
 * same cards the listing shows, one "Did you mean" on a near miss, and the no-results state's
 * Ask us handoff — the gallery's own WhatsApp and email from the site settings, the words carried
 * in the message; never a price, never a deal. It renders inside the page's `<Suspense>`.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { SearchResultVM } from '../../../server/gallery/catalogue/view-models'
import { Button, TextLink } from '../../../shared/ui'
import browse from '../browse/browse.module.css'
import { browseText } from '../browse/copy'
import { searchHref } from '../browse/state-links'
import { WorkGrid } from '../browse/work-grid'
import styles from './search.module.css'
import { SearchHead } from './search-head'

export type SearchContact = { readonly whatsapp: string | null; readonly email: string | null }

export function SearchView({
  query,
  includeSold,
  result,
  locale,
  contact,
  form,
}: {
  readonly query: string
  readonly includeSold: boolean
  readonly result: SearchResultVM
  readonly locale: SiteLocale
  readonly contact: SearchContact
  /** The search form, set in the wash under the title. */
  readonly form?: React.ReactNode
}): React.ReactElement {
  const t = browseText(locale)
  const suggestion =
    result.suggestion === null ? null : (result.suggestion.historical ?? result.suggestion.label)
  const lede = (
    <>
      <span className={styles.ledeLine}>{t('search.resultsFor', { query })}</span>
      <span className={styles.ledeLine}>
        <span className={styles.count} aria-live="polite">
          {t('message.works', { count: result.total })}
        </span>
        <TextLink
          className={styles.ledeLink}
          href={searchHref(query, !includeSold, locale)}
          aria-current={includeSold ? 'true' : undefined}
        >
          {t(includeSold ? 'search.withoutSold' : 'browse.includeSold')}
        </TextLink>
      </span>
      {suggestion !== null && (
        <span className={styles.ledeLine}>
          <TextLink href={searchHref(suggestion, includeSold, locale)}>
            {t('empty.didYouMean', { suggestion })}
          </TextLink>
        </span>
      )}
    </>
  )
  return (
    <>
      <SearchHead title={t('search.title')} lede={lede}>
        {form}
      </SearchHead>
      <section
        className={[browse.results, styles.results].join(' ')}
        aria-label={t('search.resultsFor', { query })}
      >
        {result.items.length > 0 ? (
          <WorkGrid works={result.items} locale={locale} />
        ) : (
          <AskUs query={query} locale={locale} contact={contact} />
        )}
      </section>
    </>
  )
}

/** The no-results state: plain words, then the gallery's own channels, the query in the message. */
function AskUs({
  query,
  locale,
  contact,
}: {
  readonly query: string
  readonly locale: SiteLocale
  readonly contact: SearchContact
}): React.ReactElement {
  const t = browseText(locale)
  const digits = contact.whatsapp?.replace(/\D/g, '') ?? ''
  return (
    <div className={styles.ask}>
      <p className={styles.askLine}>{t('empty.search', { query })}</p>
      <p className={styles.askText}>{t('empty.askUs', { query })}</p>
      <div className={styles.askActions}>
        {digits !== '' && (
          <Button
            href={`https://wa.me/${digits}?text=${encodeURIComponent(query)}`}
            variant="secondary"
          >
            {t('action.whatsapp')}
          </Button>
        )}
        {contact.email !== null && contact.email !== '' && (
          <Button
            href={`mailto:${contact.email}?subject=${encodeURIComponent(query)}`}
            variant="secondary"
          >
            {t('empty.askByEmail')}
          </Button>
        )}
      </div>
    </div>
  )
}
