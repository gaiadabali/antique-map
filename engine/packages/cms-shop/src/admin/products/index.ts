/**
 * The product editor and the product list (TASKS.md 27.2), one export list for the admin barrel
 * (`../views.ts`, `@engine/cms/admin/views`), whose names the products collection's admin config
 * references (`collections/products/admin.ts`). Exports only.
 */
export { ProductCategoryField, ProductCategoryInPlace } from './category-field'
export { ProductDocActions } from './doc-actions'
export { ProductListBar } from './list-bar'
export { ProductPhotoCell, ProductStockCell } from './list-cells'
export { ProductPhotosField } from './photos-field'
export { ProductStatusField } from './status-field'
export { ProductStockField } from './stock-field'
export { ProductVariantsField } from './variants-field'
