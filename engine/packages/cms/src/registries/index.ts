/**
 * The CMS registries (PARALLEL-TRACKS.md §1, TASKS.md 3.2.e) — `@engine/cms/registries`.
 */
export { assertDraftAccess, registeredCollections, registeredGlobals } from './collections'
export { DuplicateRegistryEntry, uniqueEntries, type Lane, type RegistryEntry } from './entries'
export { JOB_TASKS, JOB_WORKFLOWS, jobTasks, jobWorkflows } from './jobs'
export { pluginEntries, registeredPlugins } from './plugins'
export { mediaStoragePlugin, storageConfigured, uploadCollectionSlugs } from './storage'
export { ADMIN_VIEWS, adminViews } from './views'
