/**
 * Vitest `globalSetup` for the real-database project (`pnpm test:db`): today's one CMS's two
 * template databases, one migrated and one pushed (`@engine/cms-core/db/test-templates`).
 */
import { templatesSetup } from '@engine/cms-core/db/test-templates'

import { migrations } from '../migrations'
import { buildEngineConfig, engineConfig } from '../payload.config'

export default function setup() {
  return templatesSetup({ config: engineConfig, build: buildEngineConfig, migrations }, 'cms')
}
