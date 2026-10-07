/**
 * `loadDashboard(payload, user, { site, period })` — everything one site's tab shows, for one
 * period and the one before it. Each panel's query is its own file here; this file only gathers
 * them. The owner check runs first and throws `DashboardForbidden` for anyone else, so the view
 * has nothing to render for an editor or a store user but the panel-less state.
 */
import type { Payload } from 'payload'

import type { SignedIn } from '../../../collections/users/roles'
import { ownerContext, type DashboardContext, type Site } from '../context'
import type { Period } from '../period'

import { loadAntiques, type AntiquesPanel } from './antiques'
import { loadAsks, type AsksPanel } from './asks'
import { loadBusiness, type BusinessPanel } from './business'
import { loadChat, type ChatPanel } from './chat'
import { loadFulfilment, type FulfilmentPanel } from './fulfilment'
import { loadFunnel, type FunnelPanel } from './funnel'
import { loadPayments, type PaymentsPanel } from './payments'
import { loadSales, type SalesPanel } from './sales'
import { loadSearch, type SearchPanel } from './search'
import { loadVisitors, type VisitorsPanel } from './visitors'
import { loadVitals, type VitalsPanel } from './vitals'

export type Dashboard = {
  readonly site: Site
  readonly period: Period
  readonly visitors: VisitorsPanel
  readonly asks: AsksPanel
  readonly chat: ChatPanel
  /** The gallery's panels only. */
  readonly search: SearchPanel | null
  readonly antiques: AntiquesPanel | null
  /** The shop's paid orders and revenue, read apart from the fuller `sales` panel (DR-10 history). */
  readonly business: BusinessPanel | null
  /** The shop's panels only. */
  readonly funnel: FunnelPanel | null
  readonly sales: SalesPanel | null
  readonly fulfilment: FulfilmentPanel | null
  readonly payments: PaymentsPanel | null
  readonly vitals: VitalsPanel | null
}

export type {
  AntiquesPanel,
  AsksPanel,
  BusinessPanel,
  ChatPanel,
  FulfilmentPanel,
  FunnelPanel,
  PaymentsPanel,
  SalesPanel,
  SearchPanel,
  VisitorsPanel,
  VitalsPanel,
}

export async function loadDashboard(
  payload: Payload,
  user: SignedIn,
  input: { site: Site; period: Period; now?: Date },
): Promise<Dashboard> {
  const ctx: DashboardContext = await ownerContext(
    payload,
    user,
    input.site,
    input.period,
    input.now,
  )
  const gallery = ctx.site === 'gallery'
  // One panel at a time: each panel runs its few queries together, but all eleven at once would
  // ask the pool (10 clients, a 5 s wait for one) for far too many connections in a single load.
  const visitors = await loadVisitors(ctx)
  const asks = await loadAsks(ctx)
  const chat = await loadChat(ctx)
  const search = gallery ? await loadSearch(ctx) : null
  const antiques = gallery ? await loadAntiques(ctx) : null
  const business = await loadBusiness(ctx)
  const funnel = gallery ? null : await loadFunnel(ctx)
  const sales = gallery ? null : await loadSales(ctx)
  const fulfilment = gallery ? null : await loadFulfilment(ctx)
  const payments = gallery ? null : await loadPayments(ctx)
  const vitals = gallery ? null : await loadVitals(ctx)
  return {
    site: ctx.site,
    period: ctx.period,
    visitors,
    asks,
    chat,
    search,
    antiques,
    business,
    funnel,
    sales,
    fulfilment,
    payments,
    vitals,
  }
}
