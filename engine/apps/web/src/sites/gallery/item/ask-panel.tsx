/**
 * The item page's status and Ask panel (5.2.d; EXPERIENCE-GALLERY.md §5): a conversation, never
 * a checkout. `available` says *Price on request* and leads with **Ask about this**; `on-hold`
 * wears its badge and still asks; `sold` says **Sold** and — the owner's decision of 2026-10-06 —
 * offers **Ask for another example**, never "Ask about this", no price, no "available" wording
 * (G10). The Ask target is a prop: 5.3's WhatsApp builder replaces the plain contact page, the
 * email address is a text link beside it, and when the gallery's channels have not arrived yet
 * (OA2) the panel links the Contact page with a placeholder notice instead — never a fake number.
 */
import type { SiteLocale } from '@engine/config/sites'

import type { ItemView } from '../../../server/gallery/item/view-model'
import { Badge, Button, TextLink } from '../../../shared/ui'
import { contactText } from '../contact/messages'
import { itemText } from './copy'
import styles from './item.module.css'

export function AskPanel({
  work,
  locale,
  askHref,
  emailHref,
  emailAddress,
  contactMissing,
}: {
  readonly work: ItemView
  readonly locale: SiteLocale
  /** The WhatsApp builder's `wa.me` address, or the Contact page when no number has arrived. */
  readonly askHref: string
  /** The `mailto:` address beside the button, or `null` while no address has arrived. */
  readonly emailHref?: string | null
  /** The address itself, the mail link's text, for visitors without a mail app (§8). */
  readonly emailAddress?: string | null
  /** True when neither channel has arrived yet (OA2): the placeholder notice shows. */
  readonly contactMissing?: boolean
}): React.ReactElement {
  const email = emailHref ?? null
  const address = emailAddress ?? null
  const missing = contactMissing ?? false
  const t = itemText(locale)
  const c = contactText(locale)

  if (work.status === 'sold') {
    return (
      <div className={styles.panel} data-status="sold">
        <Badge tone="default">{t('status.sold')}</Badge>
        <Button href={askHref}>{c('item.askAnother')}</Button>
        {missing && <p className={styles.panelFine}>{c('contactPage.placeholder')}</p>}
      </div>
    )
  }

  const contact = (
    <PanelContact c={c} emailHref={email} address={address} contactMissing={missing} />
  )

  if (work.status === 'on-hold') {
    return (
      <div className={styles.panel} data-status="on-hold">
        <Badge tone="caution">{t('status.onHold')}</Badge>
        <p className={styles.panelNote}>{t('item.onHoldExplain')}</p>
        <Button href={askHref}>{t('item.askOnHold')}</Button>
        {contact}
        <p className={styles.panelFine}>{t('item.shipping')}</p>
      </div>
    )
  }

  return (
    <div className={styles.panel} data-status="available">
      <span className={styles.priceOnRequest}>{t('price.onRequest')}</span>
      <p className={styles.panelNote}>{t('item.heldIn')}</p>
      <Button href={askHref}>{t('item.ask')}</Button>
      {contact}
      <p className={styles.panelFine}>{t('item.shipping')}</p>
    </div>
  )
}

/** The email link beside the button, or the placeholder notice while no channel has arrived. */
function PanelContact({
  c,
  emailHref,
  address,
  contactMissing,
}: {
  readonly c: ReturnType<typeof contactText>
  readonly emailHref: string | null
  readonly address: string | null
  readonly contactMissing: boolean
}): React.ReactElement | null {
  if (emailHref !== null) {
    return (
      <p className={styles.panelFine}>
        {address === null ? (
          <TextLink href={emailHref}>{c('contactPage.emailLink')}</TextLink>
        ) : (
          <>
            {c('contactPage.emailOr')} <TextLink href={emailHref}>{address}</TextLink>
          </>
        )}
      </p>
    )
  }
  return contactMissing ? <p className={styles.panelFine}>{c('contactPage.placeholder')}</p> : null
}
