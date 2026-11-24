/** The shop catalogue's reads (6.1). Pages import the cached wrappers and the VM types only. */
export { availabilityFor, withAvailability, type ProductAvailability } from './availability'
export {
  categories,
  categoryId,
  listing,
  product,
  productEditorial,
  search,
  type ListingOptions,
} from './catalogue'
export type { ListingSort } from './queries'
export { getCategories, getCategoryId, getProduct, listProducts, productsByIds } from './queries'
export { getRelatedWork } from './related-work'
export { searchProductIds } from './search'
export type {
  CatalogueImage,
  CategoryVM,
  ListingVM,
  ProductCardVM,
  ProductVM,
  RelatedWorkVM,
  VariantVM,
} from './view-models'
