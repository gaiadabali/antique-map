/**
 * The shop header's server half: the links with the current page marked (from the public path the
 * proxy hands the request, as `PrimaryNav` reads it), the search and bag addresses, the bag's count
 * and whether this is the home (whose hero the header lies clear over). The client half is
 * `./shop-header`.
 */
import type { LocaleCode } from '@engine/config/constants'
import type { SiteLocale } from '@engine/config/sites'
import { PROXY_REQUEST_HEADERS } from '@engine/http/manifest'
import type { ReactNode } from 'react'
import { headers } from 'next/headers'

import { isCurrent, navItems } from '../../../shell/primary-nav'
import { siteHref, type ShellText } from '../../../shell/site'
import { BagLink } from './bag-link'
import { ShopHeader } from './shop-header'
import { shopShellText } from './shell-messages'

type Props = {
  readonly locale: LocaleCode
  readonly homeHref: string
  readonly logo: ReactNode
  readonly locales: ReactNode
  readonly t: ShellText
}

export async function ShopHeaderSlot({ locale, homeHref, logo, locales, t }: Props) {
  const path = (await headers()).get(PROXY_REQUEST_HEADERS.publicPath)
  const href = siteHref('shop')
  const words = shopShellText(locale as SiteLocale)
  const links = navItems('shop').map((item) => {
    const target = item.href(locale)
    return { href: target, label: t(item.label), current: isCurrent(path, target) }
  })
  const here = path?.split(/[?#]/)[0]?.replace(/\/+$/, '') || '/'
  const home = homeHref.replace(/\/+$/, '') || '/'
  return (
    <ShopHeader
      logo={logo}
      links={links}
      locales={locales}
      search={{ href: href('search', { q: '' }, locale), label: words('shell.shop.search') }}
      bag={<BagLink href={href('cart', {}, locale)} t={words} />}
      overlay={here === home}
      navLabel={t('shell.menu')}
      openLabel={t('shell.menu.open')}
      closeLabel={t('shell.menu.close')}
      menuLabel={t('shell.menu')}
    />
  )
}
