/**
 * The admin's sidebar (TASKS.md 27.6.b), in place of Payload's (`admin.components.Nav`): the same
 * frame — Payload's `NavWrapper`, hamburger, groups, links and log-out, so it looks and behaves as
 * the admin always has (the Indies theme styles Payload's own classes) — with the entries laid out
 * by the CMS's own plan (`./plan.ts`) rather than by each collection's group: the working screens sit among the
 * collections they serve, and the technical records and the gallery are folded.
 *
 * A server component: it reads the role and what Payload says the person may see
 * (`visibleEntities`) and each entry's label from the config, and hands plain data to the client
 * list (`./client.jsx`), which marks the current page. Folded or open, a group remembers what the
 * person chose (Payload's own nav preference). The language link and the laptop's open sidebar
 * (`../language-link.jsx`) stay at the foot. `.jsx`: see `../shared.jsx`'s header.
 *
 * Each CMS binds its plan in its own admin barrel — `AdminNav = (props) => PlannedNav({ ...props,
 * plan, today })` — so the import map names that CMS's component; `today` is the link above the
 * groups, or none.
 */
import { roleOf } from '../../access'
import { NavHamburger, NavWrapper } from '@payloadcms/next/client'
import { Logout } from '@payloadcms/ui'

import { ADMIN_GROUPS } from '../groups'
import { LanguageLink } from '../language-link'
import { NavSectionsClient } from './client'
import { navText } from './copy'
import { navSections, resolveEntry } from './plan'

const pick = (label, language) => {
  if (typeof label === 'string') return label
  if (label && typeof label === 'object') return label[language] ?? label.en ?? ''
  return ''
}

function labelOf(entry, config, language) {
  if (entry.kind === 'link') return navText(entry.key, language)
  if (entry.kind === 'global') {
    const global = config.globals.find((g) => g.slug === entry.slug)
    return pick(global?.label, language) || entry.slug
  }
  const collection = config.collections.find((c) => c.slug === entry.slug)
  return pick(collection?.labels?.plural, language) || entry.slug
}

/** The person's remembered open and folded groups (Payload's `nav` preference), or none. */
async function navPreferences(payload, user) {
  if (!user?.id) return null
  try {
    const found = await payload.find({
      collection: 'payload-preferences',
      depth: 0,
      limit: 1,
      pagination: false,
      where: {
        and: [
          { key: { equals: 'nav' } },
          { 'user.relationTo': { equals: user.collection ?? 'users' } },
          { 'user.value': { equals: user.id } },
        ],
      },
    })
    return found.docs[0]?.value ?? null
  } catch {
    return null
  }
}

export async function PlannedNav(props) {
  const { payload, user, i18n, visibleEntities, permissions, plan, today: top } = props
  if (!payload?.config) return null
  const language = i18n?.language === 'id' ? 'id' : 'en'
  const role = roleOf(user)
  // As Payload's own sidebar: what `admin.hidden` leaves visible and the person may read (access).
  const readable = (kind, slug) => Boolean(permissions?.[kind]?.[slug]?.read)
  const visible = {
    collections: (visibleEntities?.collections ?? []).filter((s) => readable('collections', s)),
    globals: (visibleEntities?.globals ?? []).filter((s) => readable('globals', s)),
  }
  const prefs = await navPreferences(payload, user)
  const toItem = ({ id, href, entry }) => ({
    id,
    href,
    label: labelOf(entry, payload.config, language),
  })
  const sections = navSections(role, visible, plan).map((section) => {
    const label = ADMIN_GROUPS[section.group][language]
    const remembered = prefs?.groups?.[label]?.open
    return {
      key: section.group,
      label,
      isOpen: typeof remembered === 'boolean' ? remembered : section.folded ? false : undefined,
      items: section.entries.map(toItem),
    }
  })
  const today = top ? resolveEntry(top, role, visible) : null

  return (
    <NavWrapper baseClass="nav">
      <nav className="nav__wrap" aria-label={navText('navLabel', language)}>
        <NavSectionsClient today={today ? toItem(today) : null} sections={sections} />
        <LanguageLink user={user} i18n={i18n} />
        <div className="nav__controls">
          <Logout />
        </div>
      </nav>
      <div className="nav__header">
        <div className="nav__header-content">
          <NavHamburger baseClass="nav" />
        </div>
      </div>
    </NavWrapper>
  )
}
