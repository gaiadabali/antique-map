/**
 * The shop's contact icons (the design pass): the owner's social accounts from `site-settings`,
 * then WhatsApp, as the brands' marks (`./footer-icons`) — one list for the bar at the top and the
 * footer. Each opens in a new tab, named by its words ("Instagram", "WhatsApp +62…").
 */
import type { PublicSiteSettings } from '@engine/site/site-settings'
import { socialLinks } from '@engine/site/shell'

import { FooterIcon, socialIcon, type FooterIconName } from './footer-icons'

export type ContactIconLink = {
  readonly href: string
  readonly label: string
  readonly icon: FooterIconName
  readonly rel: string
}

/** The owner's social accounts, then WhatsApp (the contact line's words its name), as icons. */
export function contactIconLinks(
  social: PublicSiteSettings['social'],
  whatsapp: { readonly href?: string; readonly text: string } | undefined,
): readonly ContactIconLink[] {
  const links: ContactIconLink[] = socialLinks(social).map((link) => ({
    href: link.url,
    label: link.platform,
    icon: socialIcon(link.platform),
    rel: 'me noopener noreferrer',
  }))
  if (whatsapp?.href) {
    links.push({
      href: whatsapp.href,
      label: whatsapp.text,
      icon: 'whatsapp',
      rel: 'noopener noreferrer',
    })
  }
  return links
}

export function ContactIcons({
  links,
  newTab,
  className,
  linkClassName,
}: {
  readonly links: readonly ContactIconLink[]
  /** The link's name with "opens in a new tab", from the shell's lexicon. */
  readonly newTab: (label: string) => string
  readonly className?: string
  readonly linkClassName?: string
}) {
  if (links.length === 0) return null
  return (
    <ul className={className}>
      {links.map((item) => (
        <li key={item.href}>
          <a
            className={linkClassName}
            href={item.href}
            target="_blank"
            rel={item.rel}
            aria-label={newTab(item.label)}
          >
            <FooterIcon name={item.icon} />
          </a>
        </li>
      ))}
    </ul>
  )
}
