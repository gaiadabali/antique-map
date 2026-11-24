/**
 * The shop's articles (TASKS.md 28.2; the owner's feedback of 2026-11-19): each its cover picture —
 * hung whole on its well as a print, like a product card's (`PrintTile`), so a tall cover and a wide
 * one sit alike — its title and date, one link that opens its PDF in a new tab (the accessible name
 * says so). The home's "Our latest articles" shows the newest two with "See all articles"; the
 * articles page (`pages/articles`) lists them all. The read is published-only
 * (`server/shop/articles`), streamed inside `<Suspense>`; with no article, or a failed read, the
 * home leaves the section out.
 */
import { Suspense } from 'react'

import type { SiteLocale } from '@engine/config/sites'
import { PrintTile, ResponsiveImage, printAspectOf, printRatioOf } from '@engine/ui'

import { publishedArticles, type ArticleVM } from '../../../server/shop/articles/articles'
import { productText } from '../product/copy'
import { imageAlt } from '../product/synthetic'
import { CapsLink } from '../ui/caps-link'
import { RailSkeleton } from '../ui/rail-skeleton'
import { articlesHref } from './articles-address'
import { sectionsText } from './copy'
import styles from './sections.module.css'

export { ARTICLES_SLUG, articlesHref } from './articles-address'

function dateText(date: string, locale: SiteLocale): string {
  const at = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(at.getTime())) return date
  return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(at)
}

export function ArticleCards({
  articles,
  locale,
  heading,
  lead = false,
}: {
  readonly articles: readonly ArticleVM[]
  readonly locale: SiteLocale
  /** The card titles' level: under the home's h2, or the page's h1. */
  readonly heading: 'h2' | 'h3'
  /** The first cards are above the fold: their pictures load first. */
  readonly lead?: boolean
}) {
  const t = sectionsText(locale)
  const words = productText(locale)
  const Title = heading
  return (
    <ul className={styles.articles}>
      {articles.map((article, index) => {
        const cover = article.cover
        return (
          <li key={article.slug} className={styles.article}>
            <a
              className={styles.articleLink}
              href={article.pdf.url}
              target="_blank"
              rel="noopener noreferrer"
              type="application/pdf"
              aria-label={t('articles.open', { title: article.title })}
            >
              <span className={styles.articleCover}>
                {cover ? (
                  <PrintTile ratio={printRatioOf(cover)}>
                    <ResponsiveImage
                      variant="fill"
                      aspectRatio={printAspectOf(printRatioOf(cover))}
                      src={cover.url}
                      srcSet={cover.srcSet}
                      alt={imageAlt(words, cover)}
                      sizes="(max-width: 56.25rem) 90vw, 45vw"
                      priority={lead && index < 2}
                      unoptimized
                    />
                  </PrintTile>
                ) : null}
              </span>
              <Title className={styles.articleTitle}>{article.title}</Title>
              <span className={styles.articleMeta}>
                {article.date ? (
                  <time dateTime={article.date}>{dateText(article.date, locale)}</time>
                ) : null}
                <span className={styles.articleBadge}>{t('articles.pdf')}</span>
              </span>
              {article.summary ? (
                <span className={styles.articleSummary}>{article.summary}</span>
              ) : null}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

async function Latest({ locale }: { readonly locale: SiteLocale }) {
  let articles: readonly ArticleVM[] = []
  try {
    articles = await publishedArticles(locale, 2)
  } catch {
    articles = []
  }
  if (articles.length === 0) return null
  const t = sectionsText(locale)
  return (
    <section className={styles.band} aria-labelledby="home-articles">
      <h2 id="home-articles" className={styles.bandTitle}>
        {t('articles.title')}
      </h2>
      <ArticleCards articles={articles} locale={locale} heading="h3" />
      <div className={styles.more}>
        <CapsLink href={articlesHref(locale)}>{t('articles.seeAll')}</CapsLink>
      </div>
    </section>
  )
}

/** The home's "Our latest articles": the newest two. */
export function LatestArticles({ locale }: { readonly locale: SiteLocale }) {
  return (
    <Suspense fallback={<RailSkeleton title={sectionsText(locale)('articles.title')} />}>
      <Latest locale={locale} />
    </Suspense>
  )
}
