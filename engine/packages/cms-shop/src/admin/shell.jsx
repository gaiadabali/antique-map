/**
 * The shop admin's frame (TASKS.md 27.6): the sidebar and the home laid out by the shop's plan
 * (`./nav-plan.ts`) through the shared views (`@engine/cms-core/admin/nav/view`,
 * `@engine/cms-core/admin/home/view`), the Today cards above the home's groups, and store staff sent
 * to their orders. `.jsx`: see `@engine/cms-core/admin/shared.jsx`'s header.
 */
import { PlannedHome } from '@engine/cms-core/admin/home/view'
import { PlannedNav } from '@engine/cms-core/admin/nav/view'

import { SHOP_NAV_PLAN, TODAY } from './nav-plan'
import { STORE_HOME, TodayTop } from './today/view'

export function AdminNav(props) {
  return PlannedNav({ ...props, plan: SHOP_NAV_PLAN, today: TODAY })
}

export function HomeView(props) {
  return PlannedHome({ ...props, plan: SHOP_NAV_PLAN, top: TodayTop, storeHome: STORE_HOME })
}
