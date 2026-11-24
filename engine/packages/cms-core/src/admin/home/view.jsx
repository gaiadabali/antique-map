/**
 * The admin's home (`views.dashboard`): Payload's own dashboard look — a heading per group and a
 * card per entry, with a "+" on each collection the person may create in (the owner's request,
 * 2026-11-16, after Payload's `CollectionCards` widget) — laid out by the sidebar's plan
 * (`../nav/plan.ts`), so the home and the menu list the same things in the same order: Content
 * first, then Orders, Catalogue, Stores, Settings, the technical records and the gallery. The
 * working screens (the orders inbox, the stock matrix, the imports) are cards too. Above them,
 * the CMS's own `top` (the shop's Today cards: orders to act on, low stock, drafts, the owner's
 * leads and sales, as the owner asked on 2026-11-16); its heading is for screen readers only.
 *
 * Store staff never see it: their home is `storeHome` (their orders), a server redirect before
 * anything renders (TASKS.md 10.8.c, 27.6.b). Each CMS binds `plan`, `top` and `storeHome` in its
 * admin barrel: `HomeView = (props) => PlannedHome({ ...props, plan, top, storeHome })`.
 * `.jsx`: see `../shared.jsx`'s header.
 */
import { hasRole, roleOf } from '../../access'
import { Button, Card, Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'

import { ADMIN_GROUPS } from '../groups'
import { navText } from '../nav/copy'
import { navSections } from '../nav/plan'
import { homeText } from './copy'

const pick = (label, language) => {
  if (typeof label === 'string') return label
  if (label && typeof label === 'object') return label[language] ?? label.en ?? ''
  return ''
}

function titleOf(entry, config, language) {
  if (entry.kind === 'link') return navText(entry.key, language)
  if (entry.kind === 'global') {
    return pick(config.globals.find((g) => g.slug === entry.slug)?.label, language) || entry.slug
  }
  const collection = config.collections.find((c) => c.slug === entry.slug)
  return pick(collection?.labels?.plural, language) || entry.slug
}

function EntryCard({ resolved, title, mayCreate, language }) {
  const { entry, href } = resolved
  const create =
    entry.kind === 'collection' && mayCreate ? (
      <Button
        aria-label={homeText('create', language, { label: title })}
        buttonStyle="icon-label"
        el="link"
        icon="plus"
        iconStyle="with-border"
        round
        to={`${href}/create`}
      />
    ) : undefined
  return (
    <li>
      <Card
        actions={create}
        buttonAriaLabel={homeText('open', language, { label: title })}
        href={href}
        id={`card-${resolved.id}`}
        title={title}
        titleAs="h3"
      />
    </li>
  )
}

export async function PlannedHome(props) {
  const { plan, top: Top, storeHome } = props
  const result = props.initPageResult
  const req = result?.req
  const user = req?.user ?? props.user
  if (hasRole(user, 'store') && storeHome) redirect(storeHome)
  const payload = req?.payload
  if (!payload?.config) return null
  const language = req.i18n?.language === 'id' ? 'id' : 'en'
  const permissions = result?.permissions ?? props.permissions
  const readable = (kind, slug) => Boolean(permissions?.[kind]?.[slug]?.read)
  const entities = result?.visibleEntities ?? props.visibleEntities
  const visible = {
    collections: (entities?.collections ?? []).filter((s) => readable('collections', s)),
    globals: (entities?.globals ?? []).filter((s) => readable('globals', s)),
  }
  const role = roleOf(user)
  const sections = navSections(role, visible, plan)
  const card = (resolved) => (
    <EntryCard
      key={resolved.id}
      resolved={resolved}
      title={titleOf(resolved.entry, payload.config, language)}
      mayCreate={Boolean(permissions?.collections?.[resolved.entry.slug]?.create)}
      language={language}
    />
  )

  return (
    // The page's main landmark (axe 'landmark-one-main', 'region'): Payload's frame has none.
    <main>
      <Gutter className="dashboard">
        <h1 className="today-visually-hidden">{homeText('title', language)}</h1>
        <div className="today home-today">
          {Top ? await Top({ payload, user, language }) : null}
        </div>
        <div className="collections">
          <div className="collections__wrap">
            {sections.map((section) => (
              <div className="collections__group" key={section.group}>
                <h2 className="collections__label">{ADMIN_GROUPS[section.group][language]}</h2>
                <ul className="collections__card-list">{section.entries.map(card)}</ul>
              </div>
            ))}
          </div>
        </div>
      </Gutter>
    </main>
  )
}
