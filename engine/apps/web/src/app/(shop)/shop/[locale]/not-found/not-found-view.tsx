/**
 * The shop's designed 404 (12.6): the same words and the same locale rule as the shell's
 * `NotFoundPage`, set as a page head with a way back to the shop. The shop's two not-found
 * entries (`not-found.tsx`, `not-found/page.tsx`) both render it.
 */
import { headers } from 'next/headers'

import { PROXY_REQUEST_HEADERS } from '@engine/http/manifest'

import { Button } from '../../../../../shared/ui'
import { PageHead } from '../../../../../sites/shop/ui/page-head'
import { siteLocale } from '../../../../../shell/messages'
import { currentSite, shellText, siteHref } from '../../../../../shell/site'
import styles from './not-found-view.module.css'

export async function ShopNotFoundView() {
  const site = await currentSite('shop')
  const asked = (await headers()).get(PROXY_REQUEST_HEADERS.locale)
  const locale = siteLocale(site.key, asked) ?? site.locales.default
  const t = shellText(site.key, locale)
  return (
    <div className={styles.page}>
      <PageHead id="not-found-title" title={t('notFound.title')} lede={t('notFound.body')} />
      <div className={styles.links}>
        <Button variant="primary" href={siteHref(site.key)('home', {}, locale)}>
          {t('notFound.home')}
        </Button>
      </div>
    </div>
  )
}
