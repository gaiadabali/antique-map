/** Each site's chat configuration, and the shape an app passes as `ChatDeps.sites`. */
import 'server-only'

export type {
  CatalogueAnswer,
  CatalogueContext,
  ChatSiteConfig,
  ChatSites,
  SearchCall,
  SiteCatalogue,
} from './config'
export { siteConfig } from './config'
export { galleryChat } from './gallery'
export { shopChat } from './shop'
