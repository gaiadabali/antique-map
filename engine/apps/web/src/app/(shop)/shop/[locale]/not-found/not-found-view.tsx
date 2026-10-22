/**
 * The shop's designed 404 (12.6): the same title and the same locale rule as the shell's
 * `NotFoundPage`, centred — the status in large numerals, the title, one way back to the shop.
 * The shop's two not-found entries (`not-found.tsx`, `not-found/page.tsx`) both render it.
 */
import { headers } from 'next/headers'

import { PROXY_REQUEST_HEADERS } from '@engine/http/manifest'

import { Button } from '../../../../../shared/ui'
import { siteLocale } from '../../../../../shell/messages'
import { currentSite, shellText, siteHref } from '../../../../../shell/site'
import styles from './not-found-view.module.css'

export async function ShopNotFoundView() {
  const site = await currentSite('shop')
  const asked = (await headers()).get(PROXY_REQUEST_HEADERS.locale)
  const locale = siteLocale(site.key, asked) ?? site.locales.default
  const t = shellText(site.key, locale)
  return (
    <section className={styles.page} aria-labelledby="not-found-title">
      <p className={styles.code}>404</p>
      <h1 id="not-found-title" className={styles.title}>
        {t('notFound.title')}
      </h1>
      <Button variant="primary" href={siteHref(site.key)('home', {}, locale)}>
        {t('notFound.home')}
      </Button>
    </section>
  )
}
