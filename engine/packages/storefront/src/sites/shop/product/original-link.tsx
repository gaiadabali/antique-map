/**
 * "See the original" (TASKS.md 23.5): the line under a product's delivery note naming the antique
 * the print is made from, with a link to its page in the gallery — on the gallery's own origin, in
 * a new tab, as every link from the shop to the gallery. The shop app's slot (`apps/shop/src/
 * originals`) draws it once the gallery's public read API has answered; the words are the
 * lexicon's, the style the product page's.
 */
import type { SiteLocale } from '@engine/config/sites'
import { TextLink } from '@engine/ui/text-link'

import { productText } from './copy'
import styles from './product.module.css'

export function OriginalLink({
  title,
  href,
  locale,
}: {
  readonly title: string
  /** The work's page, an absolute URL on the gallery's origin. */
  readonly href: string
  readonly locale: SiteLocale
}): React.ReactElement {
  const text = productText(locale)
  return (
    <p className={styles.original} data-original-link="">
      {text('product.original', { title })}{' '}
      <TextLink href={href} target="_blank" rel="noopener noreferrer">
        {text('product.originalLink')}
      </TextLink>
    </p>
  )
}
