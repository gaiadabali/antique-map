/**
 * The Catalogue Wall, the admin's home (TASKS.md 16.2; the surface brief's THESIS): every antique
 * and product as a matted card wearing its state, under the strip of today's work and a filter row.
 * Payload renders a replaced dashboard (`admin.components.views.dashboard`) inside its own default
 * template, so the sidebar and header stay; this view is the main column only.
 *
 * Store staff never see it: they are redirected to their order panel before anything renders
 * (a real server redirect, not the blank second of the old client-side one). Everything is read
 * through the Local API as the signed-in user (`./data.ts`). `.jsx`: see `../leads/shared.jsx`.
 */
import { redirect } from 'next/navigation'

import { hasRole } from '../../collections/users/roles'
import { countNewLeads, countOrders } from '../widgets/dashboard'
import { languageOf, t } from './copy'
import { loadCatalogueCounts, loadWall } from './data'
import { parseFilter, wallHref } from './filter'
import { Card, Empty, Filters, Pager, Search, Strip } from './parts'

/** Store staff's home: their order panel (TASKS.md 10.8.c). */
const STORE_HOME = '/admin/orders'

export async function CatalogueWall(props) {
  const result = props.initPageResult
  const req = result?.req
  const user = req?.user ?? props.user
  if (hasRole(user, 'store')) redirect(STORE_HOME)
  if (!req?.payload) return null

  const language = languageOf(req.i18n?.language)
  const filter = parseFilter(props.searchParams)
  const ctx = { payload: req.payload, user, locale: result.locale?.code }
  const isOwner = hasRole(user, 'owner')
  const reader = { req: { payload: req.payload, user } }

  const [wall, catalogue, orders, leads] = await Promise.all([
    loadWall(ctx, filter),
    loadCatalogueCounts(ctx),
    countOrders(reader),
    isOwner ? countNewLeads(reader) : 0,
  ])
  const counts = { orders, leads, ...catalogue }

  return (
    <main className="wall">
      <div className="wall__head">
        <h1 className="wall__title">{t('title', language)}</h1>
        <Search filter={filter} language={language} />
      </div>
      <Strip counts={counts} filter={filter} isOwner={isOwner} language={language} />
      <Filters filter={filter} language={language} />
      {filter.state === 'ai' ? (
        <p className="wall__note">
          {t('onlyAi', language)}{' '}
          <a href={wallHref(filter, { state: 'all', site: 'all' })}>{t('showAll', language)}</a>
        </p>
      ) : null}
      {wall.cards.length === 0 ? (
        <Empty filter={filter} language={language} />
      ) : (
        <>
          <ul className="wall__grid" aria-label={t('wall', language)}>
            {wall.cards.map((card) => (
              <Card key={card.key} card={card} language={language} />
            ))}
          </ul>
          <Pager filter={filter} pages={wall.pages} total={wall.total} language={language} />
        </>
      )}
    </main>
  )
}
