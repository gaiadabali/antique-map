/**
 * The ADM lane's custom admin components, one barrel (`../registries/views.ts`'s header; the
 * package export `@engine/cms/admin/views`). Exports only — no logic here. The shop's screens are
 * `@engine/cms-shop`'s (its own barrel, re-exported here under the names this CMS's config uses);
 * the sidebar and the home are this CMS's binding of the shared ones (`./shell.jsx`).
 */
export {
  AddStaffButton,
  AddStaffView,
  AdminIcon,
  AdminLogo,
  CreatePartnerButton,
  LanguageLink,
  PartnerLeadsList,
  ProductCategoryField,
  ProductCategoryInPlace,
  ProductDocActions,
  ProductListBar,
  ProductPhotoCell,
  ProductPhotosField,
  ProductStatusField,
  ProductStockCell,
  ProductStockField,
  ProductVariantsField,
  RupiahCell,
  StaffForStoreLink,
  StockImportView,
  StockMatrixView,
  StoreLocationField,
  TodayPageView,
  TodayView,
} from '@engine/cms-shop/admin/views'
export { AdminNav, HomeView } from './shell'
export { LeadsInboxView } from './leads/inbox'
export { LeadSourceBlock } from './leads/source-block'
export { LeadReplyBlock } from './leads/reply-block'
export { SeedsView } from './seeds/view'
export { DashboardView } from './dashboard/view'
export { CatalogueWall } from './wall/view'
export { CatalogueWallView } from './wall/page-view'
export { DraftFromPhotosButton } from '../ai/admin/draft-button'
