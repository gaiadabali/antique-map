/**
 * Today's one admin's sidebar plan (TASKS.md 27.6.b): the shop's sections
 * (`@engine/cms-shop/admin/nav-plan`), with this CMS's leads inbox in Orders and its seed screen
 * at the foot of the technical records, then the gallery's antiques, folded, until the apps split
 * (phase 26). The mechanism is `@engine/cms-core/admin/nav/plan`.
 */
import {
  CATALOGUE,
  collection,
  link,
  OWNER,
  type NavSection,
} from '@engine/cms-core/admin/nav/plan'
import { shopNavSections, TODAY } from '@engine/cms-shop/admin/nav-plan'

export {
  isCurrent,
  navSections,
  resolveEntry,
  type NavEntry,
  type NavSection,
} from '@engine/cms-core/admin/nav/plan'
export { TODAY }

export const NAV_PLAN: readonly NavSection[] = [
  ...shopNavSections({
    leads: link('leadsInbox', '/admin/leads', OWNER),
    technical: [link('seeds', '/admin/seeds', OWNER)],
  }),
  {
    group: 'gallery',
    folded: true,
    entries: [
      link('wall', '/admin/wall', CATALOGUE),
      collection('works'),
      collection('makers'),
      collection('places'),
      collection('terms'),
      collection('masters'),
    ],
  },
]

/**
 * Collections with a better door than their raw list, kept out of the menu (routes intact): the
 * orders inbox, the stock matrix, the leads inbox.
 */
export const OFF_MENU: readonly string[] = ['orders', 'stock-levels', 'leads']
