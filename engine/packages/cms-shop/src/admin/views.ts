/**
 * The shop admin's components, one barrel — the package export `@engine/cms-shop/admin/views`, which
 * every component path in the shop's config names (`@engine/cms-shop/admin/views#…`) and the import
 * map resolves. Exports only — no logic here. Today's one CMS re-exports these from its own barrel.
 */
export { CreatePartnerButton } from './partners/create-partner-button'
export { PartnerLeadsList } from './partners/partner-leads'
export { LanguageLink } from '@engine/cms-core/admin/language-link'
export { AdminNav, HomeView } from './shell'
export { StockImportView } from './stock-import/view'
export { StockMatrixView } from './stock-matrix/view'
export { StoreLocationField } from './store-map/field'
export { AdminIcon, AdminLogo } from './brand/marks'
export { RupiahCell } from './cells'
export { TodayView } from './today/view'
export { TodayPageView } from './today/page-view'
export { AddStaffButton } from './staff/add-button'
export { AddStaffView } from './staff/add-view'
export { StaffForStoreLink } from './staff/for-store-link'
export {
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
} from './products'
