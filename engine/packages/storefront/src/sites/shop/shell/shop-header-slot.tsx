/**
 * The shop header's server half: the links with the current page marked (from the public path the
 * proxy hands the request, as `PrimaryNav` reads it), the search and bag addresses, the bag's count
 * and whether this is the home (whose hero the header lies clear over). The links are the owner's
 * main menu (`shop-header`; TASKS.md 27.5.c), or the shop's own four while the menu is empty.
 * The client half is `./shop-header`.
 */
import type { LocaleCode } from '@engine/config/constants'
import type { SiteLocale } from '@engine/config/sites'
import { PROXY_REQUEST_HEADERS } from '@engine/http/manifest'
import type { ReactNode } from 'react'
import { headers } from 'next/headers'

import type { NavLink } from '../../../server/shop/pages/navigation/load'
import { isCurrent, navItems } from '../../../shell/primary-nav'
import { siteHref, type ShellText } from '../../../shell/site'
import { BagLink } from './bag-link'
import { SearchBar } from './search-bar'
import { ShopHeader } from './shop-header'
import { shopShellText } from './shell-messages'

type Props = {
  readonly locale: LocaleCode
  readonly homeHref: string
  readonly logo: ReactNode
  readonly locales: ReactNode
  /** The owner's main menu, resolved; empty draws the shop's own four links. */
  readonly menu: readonly NavLink[]
  /** The contact details, drawn in the phone's menu (TASKS.md 28.2). */
  readonly contact?: ReactNode
  readonly t: ShellText
}

export async function ShopHeaderSlot({ locale, homeHref, logo, locales, menu, contact, t }: Props) {
  const path = (await headers()).get(PROXY_REQUEST_HEADERS.publicPath)
  const href = siteHref('shop')
  const words = shopShellText(locale as SiteLocale)
  const links =
    menu.length > 0
      ? menu.map((item) => ({
          href: item.href,
          label: item.label,
          current: !item.external && isCurrent(path, item.href),
          ...(item.external ? { newTabLabel: t('shell.newTab', { label: item.label }) } : {}),
        }))
      : navItems('shop').map((item) => {
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
      contact={contact}
      search={
        <SearchBar
          action={href('search', { q: '' }, locale)}
          openLabel={words('shell.shop.search')}
          fieldLabel={words('shell.shop.searchField')}
          submitLabel={words('shell.shop.searchSubmit')}
          closeLabel={words('shell.shop.searchClose')}
        />
      }
      bag={<BagLink href={href('cart', {}, locale)} t={words} />}
      overlay={here === home}
      navLabel={t('shell.menu')}
      openLabel={t('shell.menu.open')}
      closeLabel={t('shell.menu.close')}
      menuLabel={t('shell.menu')}
    />
  )
}
