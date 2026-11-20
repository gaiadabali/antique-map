/**
 * Test support only — registers today's one CMS for the shared real-database stacks
 * (`@engine/cms-core/db/test-cms`): every support path of this package imports this first.
 */
import { useTestCms } from '@engine/cms-core/db/test-cms'

import { migrations } from '../migrations'
import { buildEngineConfig, engineConfig } from '../payload.config'

useTestCms({ config: engineConfig, build: buildEngineConfig, migrations })
