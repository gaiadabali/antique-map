/**
 * One editorial or information page (5.4.b, 14.6; Ivory and ink 18; EXPERIENCE-GALLERY.md §7):
 * it opens on its paper, holding the level-1 `SectionHead` (title, the intro as its lede) —
 * or, with a hero sheet, leads with the shared `Crossing`, the sheet lying whole across the field
 * onto the paper — then the body's paragraphs at the reading measure, and any works rail through
 * the shared `WorkGrid` under its own head. "Prose" and "work rail" are the two block kinds the
 * `pages` collection offers today
 * (`intro`/`body` plain text, `works` a relationship); "figure", "FAQ" and "call to action" blocks
 * wait on rich-text blocks (TASKS.md 9.3) — a gap named in the ticket's report, not built here.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { PageVM } from '../../../server/gallery/pages/view-models'
import { Band, Crossing, ResponsiveImage, SectionHead } from '../../../shared/ui'
import { WorkGrid } from '../browse/work-grid'
import type { CmsPageText } from './copy'
import styles from './pages.module.css'

type Props = {
  readonly page: PageVM
  readonly locale: SiteLocale
  readonly t: CmsPageText
}

const FALLBACK_RATIO = 4 / 3
/** The hero's own width over height, held between 4:5 and 3:2 (as the home's lead sheet is). */
const clamp = (ratio: number) => Math.min(1.5, Math.max(0.8, ratio))

export function PageView({ page, locale, t }: Props) {
  const { hero } = page
  const ratio =
    hero !== null && hero.width !== null && hero.height !== null && hero.height > 0
      ? clamp(hero.width / hero.height)
      : FALLBACK_RATIO
  const title = <SectionHead level={1} title={page.title} lede={page.intro ?? undefined} />
  return (
    <div className={styles.wrap}>
      <article>
        {hero !== null ? (
          <Crossing
            lead
            pigment={1}
            fit="contain"
            ratio={ratio}
            copy={title}
            picture={
              <ResponsiveImage
                variant="fill"
                aspectRatio={String(ratio)}
                src={hero.url}
                srcSet={hero.srcSet}
                alt={hero.alt}
                sizes="(max-width: 63.99rem) 100vw, 55vw"
                priority
              />
            }
          />
        ) : (
          <Band pigment={1} strength="wash" pad={false} className={styles.band}>
            {title}
          </Band>
        )}
        <div className={styles.page}>
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
        </div>
      </article>
    </div>
  )
}
