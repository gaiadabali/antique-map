/**
 * The designed not-found page, at placeholder fidelity (C2 `NotFoundVM` is phase 22's). It gets no
 * params, so it reads the locale the proxy passed on (C13 `PROXY_REQUEST_HEADERS.locale`), which
 * overwrites whatever a client sent.
 */
import { PROXY_REQUEST_HEADERS } from '@engine/http/manifest'
import { resolveLocale } from '@engine/i18n'
import { headers } from 'next/headers'

import { currentBrand } from '../../../shell/brand'
import { brandHref } from '../../../shell/links'
import { shellMessages } from '../../../shell/messages'

export default async function NotFound() {
  const asked = (await headers()).get(PROXY_REQUEST_HEADERS.locale)
  const locale = resolveLocale((await currentBrand()).config, asked)
  const { t } = await shellMessages(locale)
  const href = await brandHref()
  return (
    <>
      <h1>{t('notFound.title')}</h1>
      <p>{t('notFound.body')}</p>
      <p>
        <a href={href('home', {}, locale)}>{t('notFound.home')}</a>
      </p>
    </>
  )
}
