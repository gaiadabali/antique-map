/**
 * The item page's status and Ask panel (5.2.d; EXPERIENCE-GALLERY.md §5): a conversation, never
 * a checkout. `available` says *Price on request* and leads with **Ask about this**; `on-hold`
 * wears its badge and still asks; `sold` says **Sold** and nothing else — no Ask button, no
 * price, no buyer, no "available" wording (G10, ticket 5.2b). The Ask target is a prop: 5.3's
 * WhatsApp builder replaces the plain contact page, so the panel never builds the address.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { ItemView } from '../../../server/gallery/item/view-model'
import { Badge, Button } from '../../../shared/ui'
import { itemText } from './copy'
import styles from './item.module.css'

export function AskPanel({
  work,
  locale,
  askHref,
}: {
  readonly work: ItemView
  readonly locale: SiteLocale
  /** TODO(5.3): the WhatsApp builder's address replaces the plain contact page. */
  readonly askHref: string
}): React.ReactElement {
  const t = itemText(locale)

  if (work.status === 'sold') {
    return (
      <aside className={styles.panel} data-status="sold">
        <Badge tone="default">{t('status.sold')}</Badge>
      </aside>
    )
  }

  if (work.status === 'on-hold') {
    return (
      <aside className={styles.panel} data-status="on-hold">
        <Badge tone="caution">{t('status.onHold')}</Badge>
        <p className={styles.panelNote}>{t('item.onHoldExplain')}</p>
        <Button href={askHref}>{t('item.askOnHold')}</Button>
        <p className={styles.panelFine}>{t('item.shipping')}</p>
      </aside>
    )
  }

  return (
    <aside className={styles.panel} data-status="available">
      <span className={styles.priceOnRequest}>{t('price.onRequest')}</span>
      <p className={styles.panelNote}>{t('item.heldIn')}</p>
      <Button href={askHref}>{t('item.ask')}</Button>
      <p className={styles.panelFine}>{t('item.shipping')}</p>
    </aside>
  )
}
