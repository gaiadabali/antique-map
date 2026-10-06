/**
 * One editorial or information page (5.4.b; EXPERIENCE-GALLERY.md §7): the title, an optional
 * intro, the hero image, the body's paragraphs — "prose" and "work rail" are the two block kinds
 * the `pages` collection actually offers today (`intro`/`body` plain text, `works` a relationship);
 * "figure", "FAQ" and "call to action" blocks wait on rich-text blocks (TASKS.md 9.3, the
 * collection's own admin description) — a gap named in the ticket's report, not built here. A
 * story's works close the page under its own heading; a curated page's works do too.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { PageVM } from '../../../server/gallery/pages/view-models'
import { ResponsiveImage } from '../../../shared/ui'
import { WorkGrid } from '../browse/work-grid'
import type { CmsPageText } from './copy'
import styles from './pages.module.css'

type Props = {
  readonly page: PageVM
  readonly locale: SiteLocale
  readonly t: CmsPageText
}

export function PageView({ page, locale, t }: Props) {
  return (
    <>
      <div className={styles.wrap}>
        <section className={styles.section}>
          {page.hero !== null && (
            <ResponsiveImage
              variant="fill"
              aspectRatio="16 / 9"
              src={page.hero.url}
              alt={page.hero.alt}
              sizes="(max-width: 767px) 100vw, 48rem"
              className={styles.hero}
            />
          )}
          <h1>{page.title}</h1>
          {page.intro !== null && <p className={styles.intro}>{page.intro}</p>}
          <div className={styles.body}>
            {page.body.map((paragraph, at) => (
              // The body's own order, never reordered — a plain index key is stable here.
              <p key={at}>{paragraph}</p>
            ))}
          </div>
        </section>
      </div>
      {page.works.length > 0 && (
        <div className={styles.worksWrap}>
          <h2>{t('cmsPage.worksHeading')}</h2>
          <WorkGrid works={page.works} locale={locale} />
        </div>
      )}
    </>
  )
}
