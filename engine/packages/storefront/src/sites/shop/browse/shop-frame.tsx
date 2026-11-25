/**
 * The shop page's frame (the UI/UX revision of 2026-11-25): the same-day promise, the
 * breadcrumb, then the left panel (`./shop-panel`) beside the view — its title, with the count of
 * what it lists, a line of description, and its cards. The listings (`./browse-view`) and the
 * themes' and product types' cards (`./shop-by-view`) draw inside it.
 */
import type { ReactNode } from 'react'

import { createHref, SITES, type SiteLocale } from '@engine/config/sites'

import { sectionsText } from '../sections/copy'
import { shopShellText } from '../shell/shell-messages'
import { Crumb } from '../ui/crumb'
import styles from './browse.module.css'
import frame from './shop-panel.module.css'

type Props = {
  readonly locale: SiteLocale
  /** The left panel (`ShopPanel`). */
  readonly panel: ReactNode
  /** The view's title: the page's one h1. */
  readonly title: string
  /** How many things the view lists, raised beside the title. */
  readonly total?: number
  readonly description?: string
  /** A line above the page (the same-day promise). */
  readonly banner?: ReactNode
  readonly children: ReactNode
}

export function ShopFrame({
  locale,
  panel,
  title,
  total,
  description,
  banner,
  children,
}: Props): React.ReactElement {
  const shell = shopShellText(locale)
  const href = createHref(SITES.shop)
  return (
    <section className={styles.browse} aria-labelledby="browse-title">
      {banner ? <div className={styles.banner}>{banner}</div> : null}
      <Crumb
        homeHref={href('home', {}, locale)}
        homeLabel={shell('shell.shop.home')}
        label={shell('shell.shop.breadcrumb')}
        steps={[
          { label: sectionsText(locale)('shopBy.title'), href: href('browse', {}, locale) },
          { label: title },
        ]}
      />
      <div className={frame.layout}>
        {panel}
        <div className={frame.content}>
          <div className={styles.head}>
            <h1 id="browse-title" className={styles.title}>
              {title}
              {total !== undefined ? <sup className={styles.total}>({total})</sup> : null}
            </h1>
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>
          {children}
        </div>
      </div>
    </section>
  )
}
