/**
 * The articles list's own address (TASKS.md 28.2): a page of the shop at `/{locale}/articles`. Its
 * own module, free of the articles' read, so the shop's menu can link it (`shell/primary-nav`).
 */
import { createHref, SITES, type SiteLocale } from '@engine/config/sites'

export const ARTICLES_SLUG = 'articles'

export function articlesHref(locale: SiteLocale): string {
  return createHref(SITES.shop)('page', { slug: ARTICLES_SLUG }, locale)
}
