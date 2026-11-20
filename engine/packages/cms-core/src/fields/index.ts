/**
 * Field builders and validators every CMS shares — `@engine/cms-core/fields`: the URL slug
 * (`./slug`), a translation's staff-only status (`./translation-status`), the publish-time and
 * default-locale checks and web addresses (`./validate`), folding a form's sections
 * (`./fold`), and a refusal's label (`./as-label`).
 */
export { asLabel } from './as-label'
export { foldSections } from './fold'
export {
  nextFreeSlug,
  SLUG_MAX_LENGTH,
  SLUG_PATTERN,
  slugField,
  slugify,
  slugTaken,
  type SlugFieldOptions,
} from './slug'
export {
  TRANSLATION_STATUSES,
  translationStatusField,
  type TranslationStatus,
} from './translation-status'
export {
  IN_DEFAULT_LOCALE_NOTE,
  isBlank,
  isPublishing,
  isWebUrl,
  requiredInDefaultLocale,
  requiredToPublish,
  webUrl,
} from './validate'
