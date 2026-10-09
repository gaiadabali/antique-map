/**
 * The shop's designed 404 (12.6): the same words and the same locale rule as the shell's
 * `NotFoundPage`, set as a page head with a way back to the shop. The shop's two not-found
 * entries (`not-found.tsx`, `not-found/page.tsx`) both render it.
 */
import { headers } from 'next/headers'

import { PROXY_REQUEST_HEADERS } from '@engine/http/manifest'

import { Button, SectionHead } from '../../../../../shared/ui'
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
      <SectionHead level={1} title={t('notFound.title')} lede={t('notFound.body')} />
      <Button variant="primary" href={siteHref(site.key)('home', {}, locale)}>
        {t('notFound.home')}
      </Button>
    </div>
  )
}
