/**
 * The shop's contact details (TASKS.md 28.2; the owner's feedback of 2026-11-19: "contact details
 * on the top of the page and at the bottom; also in the drop-down list"): the phone, WhatsApp,
 * email and address from `site-settings.shop.contact` (`@engine/site/site-settings`, public fields
 * only). Drawn twice from one list: as the slim bar above the header (`bar`) and inside the phone's
 * menu (`menu`); the footer has its own Contact column. With no detail set, nothing is drawn.
 *
 * The bar (the design pass) also carries the footer's icons at its right — the owner's accounts and
 * WhatsApp (`./contact-icons`) — and stays at the top of the screen with the header under it.
 */
import type { SiteLocale } from '@engine/config/sites'
import type { PublicSiteSettings } from '@engine/site/site-settings'

import { sectionsText } from '../sections/copy'
import { ContactIcons, contactIconLinks } from './contact-icons'
import styles from './contact-strip.module.css'

type Line = {
  readonly key: 'phone' | 'whatsapp' | 'email' | 'address'
  readonly text: string
  readonly href?: string
  readonly label?: string
  readonly away?: boolean
}

/** The settings' contact as lines, in the owner's order: phone, WhatsApp, email, address. */
export function contactLinesOf(
  contact: PublicSiteSettings['contact'],
  locale: SiteLocale,
): readonly Line[] {
  const t = sectionsText(locale)
  const lines: Line[] = []
  if (contact.phone) {
    lines.push({
      key: 'phone',
      text: contact.phone,
      href: `tel:${contact.phone.replace(/[^+\d]/g, '')}`,
      label: t('contact.phoneLabel', { number: contact.phone }),
    })
  }
  if (contact.whatsapp) {
    lines.push({
      key: 'whatsapp',
      text: t('contact.whatsapp', { number: contact.whatsapp }),
      href: `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`,
      label: t('contact.whatsappLabel', { number: contact.whatsapp }),
      away: true,
    })
  }
  if (contact.email) {
    lines.push({
      key: 'email',
      text: contact.email,
      href: `mailto:${contact.email}`,
      label: t('contact.emailLabel', { email: contact.email }),
    })
  }
  if (contact.address) lines.push({ key: 'address', text: contact.address })
  return lines
}

export function ContactStrip({
  contact,
  locale,
  variant,
  social,
  newTab,
}: {
  readonly contact: PublicSiteSettings['contact']
  readonly locale: SiteLocale
  readonly variant: 'bar' | 'menu'
  /** The bar's icons: the owner's accounts (WhatsApp's from `contact`). */
  readonly social?: PublicSiteSettings['social']
  /** An icon's name with "opens in a new tab", from the shell's lexicon. */
  readonly newTab?: (label: string) => string
}) {
  const lines = contactLinesOf(contact, locale)
  const icons =
    variant === 'bar' && newTab
      ? contactIconLinks(
          social ?? null,
          lines.find((line) => line.key === 'whatsapp'),
        )
      : []
  if (lines.length === 0 && icons.length === 0) return null
  return (
    <nav
      className={variant === 'bar' ? styles.bar : styles.menu}
      aria-label={sectionsText(locale)('contact.label')}
      data-contact={variant}
    >
      <ul className={styles.list}>
        {lines.map((line) => (
          <li key={line.key} className={styles.item} data-line={line.key}>
            {line.href ? (
              <a
                href={line.href}
                aria-label={line.label}
                {...(line.away ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {line.text}
              </a>
            ) : (
              <span>{line.text}</span>
            )}
          </li>
        ))}
      </ul>
      {newTab ? (
        <ContactIcons
          links={icons}
          newTab={newTab}
          className={styles.icons}
          linkClassName={styles.iconLink}
        />
      ) : null}
    </nav>
  )
}
