/**
 * One editorial or information page (5.4.b, 14.6; EXPERIENCE-GALLERY.md §7): a level-1
 * `SectionHead` (title, the intro as its lede), the hero sheet whole in a contained mat, the body's
 * paragraphs at the reading measure, and any works rail through the shared `WorkGrid` under its own
 * head. "Prose" and "work rail" are the two block kinds the `pages` collection offers today
 * (`intro`/`body` plain text, `works` a relationship); "figure", "FAQ" and "call to action" blocks
 * wait on rich-text blocks (TASKS.md 9.3) — a gap named in the ticket's report, not built here.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { PageVM } from '../../../server/gallery/pages/view-models'
import { Mat, ResponsiveImage, SectionHead } from '../../../shared/ui'
import { WorkGrid } from '../browse/work-grid'
import type { CmsPageText } from './copy'
import styles from './pages.module.css'

type Props = {
  readonly page: PageVM
  readonly locale: SiteLocale
  readonly t: CmsPageText
}

const FALLBACK_RATIO = 4 / 3

export function PageView({ page, locale, t }: Props) {
  const { hero } = page
  const ratio =
    hero !== null && hero.width !== null && hero.height !== null && hero.height > 0
      ? hero.width / hero.height
      : FALLBACK_RATIO
  return (
    <div className={styles.wrap}>
      <article className={styles.page}>
        <SectionHead level={1} title={page.title} lede={page.intro ?? undefined} />
        {hero !== null && (
          <figure className={styles.figure}>
            <Mat fit="contain">
              <ResponsiveImage
                variant="fill"
                aspectRatio={String(ratio)}
                src={hero.url}
                srcSet={hero.srcSet}
                alt={hero.alt}
                sizes="(max-width: 767px) 100vw, 56rem"
                priority
              />
            </Mat>
          </figure>
        )}
        {page.body.length > 0 && (
          <div className={styles.body}>
            {page.body.map((paragraph, at) => (
              // The body's own order, never reordered — a plain index key is stable here.
              <p key={at}>{paragraph}</p>
            ))}
          </div>
        )}
        {page.works.length > 0 && (
          <div className={styles.works}>
            <SectionHead level={2} title={t('cmsPage.worksHeading')} />
            <WorkGrid works={page.works} locale={locale} />
          </div>
        )}
      </article>
    </div>
  )
}
