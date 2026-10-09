/**
 * The ADM lane's custom admin components, one barrel (`../registries/views.ts`'s header; the
 * package export `@engine/cms/admin/views`). Exports only — no logic here.
 */
export { LeadsInboxView } from './leads/inbox'
export { LeadSourceBlock } from './leads/source-block'
export { LeadReplyBlock } from './leads/reply-block'
export { CreatePartnerButton } from './leads/create-partner-button'
export { PartnerLeadsList } from './leads/partner-leads'
export { DailyWorkHeading } from './daily-work-heading'
export { LeadsNavLink } from './leads/nav-link'
export { OrdersNavLink } from './orders/nav-link'
export { StockImportNavLink } from './stock-import/nav-link'
export { StockImportView } from './stock-import/view'
export { DashboardView } from './dashboard/view'
export { StoreHomeRedirect } from './dashboard/store-home'
export { DraftFromPhotosButton } from '../ai/admin/draft-button'
