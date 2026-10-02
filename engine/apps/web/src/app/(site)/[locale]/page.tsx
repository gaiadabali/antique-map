/**
 * The home surface at placeholder fidelity (the real one is phase 30/33's, from `HomeVM`): the
 * brand's name from config, in the locale the proxy routed to — `/` for the default locale, `/id`
 * for Indonesian (ARCHITECTURE.md §11).
 */
import { isSupportedLocale } from '@engine/i18n'
import { notFound } from 'next/navigation'

import { currentBrand } from '../../../shell/brand'
import { shellMessages } from '../../../shell/messages'

export default async function Home({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  const { config } = await currentBrand()
  if (!isSupportedLocale(config, locale)) notFound()
  const { t } = await shellMessages(locale)
  return (
    <>
      <h1>{t('home.title', { brand: config.name })}</h1>
      <p>{t('home.lede')}</p>
    </>
  )
}
