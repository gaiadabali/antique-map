import * as migration_20260929_182126_initial from './20260929_182126_initial'
import * as migration_20261001_123929_wave_a from './20261001_123929_wave_a'

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
]
