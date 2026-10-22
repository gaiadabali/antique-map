/**
 * The search form (5.1.b): a plain GET form to the search page, so a visitor without JavaScript
 * still searches; the words go in `q`, the sold archive rides along when it was asked for.
 */
import type { SiteLocale } from '@engine/config/sites'

import { Button, Input } from '../../../shared/ui'
import { browseText } from '../browse/copy'
import { searchBase } from '../browse/state-links'
import styles from './search.module.css'

export function SearchForm({
  query,
  includeSold,
  locale,
}: {
  readonly query: string
  readonly includeSold: boolean
  readonly locale: SiteLocale
}): React.ReactElement {
  const t = browseText(locale)
  return (
    <form method="get" action={searchBase(locale)} role="search" className={styles.form}>
      {includeSold && <input type="hidden" name="availability" value="sold" />}
      <Input
        id="search-q"
        label={t('search.label')}
        type="search"
        name="q"
        defaultValue={query}
        placeholder={t('search.placeholder')}
        maxLength={200}
        className={styles.input}
      />
      <Button type="submit" className={styles.submit}>
        {t('search.submit')}
      </Button>
    </form>
  )
}
