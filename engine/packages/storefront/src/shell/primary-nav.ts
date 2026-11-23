/**
 * The shop's header links, from the drawing, each a real surface of the shop — and the articles
 * list, which the owner's feedback of 2026-11-19 added (TASKS.md 28.2).
 */
import type { LocaleCode } from '@engine/config/constants'
import type { ShellMessageKey } from '@engine/i18n/shell'

import { ARTICLES_SLUG } from '../sites/shop/sections/articles-address'
import { siteHref } from './site'

export { isCurrent } from '@engine/site/shell'

/** One link: its surface, its params and the lexicon key of its label. */
export type NavItemSpec = {
  readonly label: ShellMessageKey
  readonly href: (locale: LocaleCode) => string
}

export function navItems(site: 'shop'): readonly NavItemSpec[] {
  const href = siteHref(site)
  return [
    { label: 'nav.shop', href: (l) => href('browse', {}, l) },
    { label: 'nav.collections', href: (l) => href('collection', {}, l) },
    { label: 'nav.stores', href: (l) => href('stores', {}, l) },
    { label: 'nav.articles', href: (l) => href('page', { slug: ARTICLES_SLUG }, l) },
    { label: 'nav.partnership', href: (l) => href('partnership', {}, l) },
  ]
}
