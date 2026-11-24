'use client'
/**
 * The sidebar's list (`./view.jsx`): the "Today" link, then each group as Payload's own
 * collapsible `NavGroup`, its entries as Payload's `nav__link`s — the current page marked with
 * Payload's indicator. Never prefetched: an admin page
 * is read for the person who opens it. `.jsx`: see `../leads/shared.jsx`'s header.
 */
import { Link, NavGroup } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'

import './nav.css'
import { isCurrent } from './plan'

function Item({ item, pathname }) {
  const current = isCurrent(pathname, item.href)
  const label = (
    <>
      {current ? <div className="nav__link-indicator" /> : null}
      <span className="nav__link-label">{item.label}</span>
    </>
  )
  // Always a link, the current one too (marked `aria-current`): on a working screen such as the
  // orders inbox, it is how a person clears a search or a tab and starts over.
  return (
    <Link
      className="nav__link"
      href={item.href}
      id={item.id}
      prefetch={false}
      aria-current={current ? 'page' : undefined}
    >
      {label}
    </Link>
  )
}

export function NavSectionsClient({ today, sections }) {
  const pathname = usePathname() ?? ''
  return (
    <>
      {today ? (
        <div className="ix-nav-home">
          <Item item={today} pathname={pathname} />
        </div>
      ) : null}
      {sections.map((section) => (
        <NavGroup key={section.key} isOpen={section.isOpen} label={section.label}>
          {section.items.map((item) => (
            <Item key={item.id} item={item} pathname={pathname} />
          ))}
        </NavGroup>
      ))}
    </>
  )
}
