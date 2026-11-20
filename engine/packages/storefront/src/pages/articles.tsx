/**
 * The shop's articles page (TASKS.md 28.2; the owner's feedback of 2026-11-19): every published
 * article, newest first, each its cover and title opening its PDF in a new tab. At a CMS page's
 * address (`/articles`, `/id/articles`), which the proxy rewrites to the app's `page/articles`
 * route, a fixed page beside the `[slug]` one. No article yet: an honest note, never an error.
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { createHref, SITES } from '@engine/config/sites'
import { pageMetadata } from '@engine/site/seo'

import { publishedArticles, type ArticleVM } from '../server/shop/articles/articles'
import { siteLocale } from '../shell/messages'
import { currentSite } from '../shell/site'
import { ARTICLES_SLUG, ArticleCards } from '../sites/shop/sections/articles'
import { sectionsText } from '../sites/shop/sections/copy'
import styles from '../sites/shop/sections/sections.module.css'
import { shopShellText } from '../sites/shop/shell/shell-messages'
import { Crumb } from '../sites/shop/ui/crumb'
import type { LocaleProps } from './props'

const href = createHref(SITES.shop)

export async function generateMetadata({ params }: LocaleProps): Promise<Metadata> {
  const locale = siteLocale('shop', (await params).locale)
  const site = await currentSite('shop')
  if (locale === null || site.origin === null) return {}
  const t = sectionsText(locale)
  return pageMetadata({
    site: 'shop',
    locale,
    paths: {
      en: href('page', { slug: ARTICLES_SLUG }, 'en'),
      id: href('page', { slug: ARTICLES_SLUG }, 'id'),
    },
    title: t('articles.pageTitle'),
    description: t('articles.pageLede'),
    origin: site.origin,
  })
}

export default async function ArticlesPage({ params }: LocaleProps) {
  await connection()
  const locale = siteLocale('shop', (await params).locale)
  if (locale === null) notFound()
  const t = sectionsText(locale)
  const shell = shopShellText(locale)
  let articles: readonly ArticleVM[] = []
  try {
    articles = await publishedArticles(locale)
  } catch {
    articles = []
  }
  return (
    <section className={styles.page} aria-labelledby="articles-title">
      <Crumb
        homeHref={href('home', {}, locale)}
        homeLabel={shell('shell.shop.home')}
        label={shell('shell.shop.breadcrumb')}
        steps={[{ label: t('articles.pageTitle') }]}
      />
      <h1 id="articles-title" className={styles.pageTitle}>
        {t('articles.pageTitle')}
      </h1>
      <p className={styles.pageLede}>{t('articles.pageLede')}</p>
      {articles.length === 0 ? (
        <p className={styles.pageLede}>{t('articles.empty')}</p>
      ) : (
        <ArticleCards articles={articles} locale={locale} heading="h2" lead />
      )}
    </section>
  )
}
