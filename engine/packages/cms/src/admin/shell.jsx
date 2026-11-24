/**
 * Today's one admin's frame: the shared sidebar and home (`@engine/cms-core/admin/nav/view`,
 * `@engine/cms-core/admin/home/view`) laid out by this CMS's plan (`./nav/plan.ts`: the shop's
 * sections, the leads inbox, the seed screen and the gallery's folded section), with the shop's
 * Today cards above the home's groups. `.jsx`: see `@engine/cms-core/admin/shared.jsx`'s header.
 */
import { PlannedHome } from '@engine/cms-core/admin/home/view'
import { PlannedNav } from '@engine/cms-core/admin/nav/view'
import { STORE_HOME, TodayTop } from '@engine/cms-shop/admin/today/view'

import { NAV_PLAN, TODAY } from './nav/plan'

export function AdminNav(props) {
  return PlannedNav({ ...props, plan: NAV_PLAN, today: TODAY })
}

export function HomeView(props) {
  return PlannedHome({ ...props, plan: NAV_PLAN, top: TodayTop, storeHome: STORE_HOME })
}
