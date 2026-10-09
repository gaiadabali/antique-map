/**
 * The gallery's designed not-found page (14.6), in the same hand as every other opening: a level-1
 * `SectionHead`, one or two sentences, the search form and a way into the collection. It reads the
 * locale the proxy passed on (`x-locale`), as the shell's placeholder did, and answers 404 through
 * the route that renders it (`not-found/page.tsx`, the proxy's rewrite status). Words are the
 * gallery lexicon's `notFound.*`.
 */
import { headers } from 'next/headers'

import { PROXY_REQUEST_HEADERS } from '@engine/http/manifest'

import { siteLocale } from '../../../shell/messages'
import { currentSite, siteHref } from '../../../shell/site'
import { Button, SectionHead } from '../../../shared/ui'
import { browseBase } from '../browse/state-links'
import { SearchForm } from '../search/search-form'
import { cmsPageText } from './copy'
import styles from './pages.module.css'

export async function GalleryNotFoundView() {
  const site = await currentSite('gallery')
  const asked = (await headers()).get(PROXY_REQUEST_HEADERS.locale)
  const locale = siteLocale('gallery', asked) ?? site.locales.default
  const t = cmsPageText(locale)
  return (
    <div className={styles.wrap}>
      <section className={styles.page}>
        <SectionHead level={1} title={t('notFound.title')} lede={t('notFound.body')} />
        <div className={styles.notFoundActions}>
          <SearchForm query="" includeSold={false} locale={locale} />
          <div className={styles.links}>
            <Button href={browseBase(locale)} variant="primary">
              {t('notFound.browse')}
            </Button>
            <Button href={siteHref('gallery')('home', {}, locale)} variant="quiet">
              {t('notFound.home')}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
