import * as migration_20260929_182126_initial from './20260929_182126_initial'
import * as migration_20261001_123929_wave_a from './20261001_123929_wave_a'
import * as migration_20261002_033256_works from './20261002_033256_works'
import * as migration_20261002_064308_w2_cms from './20261002_064308_w2_cms'

export const migrations = [
  {
    up: migration_20260929_182126_initial.up,
    down: migration_20260929_182126_initial.down,
    name: '20260929_182126_initial',
  },
  {
    up: migration_20261001_123929_wave_a.up,
    down: migration_20261001_123929_wave_a.down,
    name: '20261001_123929_wave_a',
  },
  {
    up: migration_20261002_033256_works.up,
    down: migration_20261002_033256_works.down,
    name: '20261002_033256_works',
  },
  {
    up: migration_20261002_064308_w2_cms.up,
    down: migration_20261002_064308_w2_cms.down,
    name: '20261002_064308_w2_cms',
  },
]
