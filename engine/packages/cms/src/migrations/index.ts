import * as migration_20261002_073156_initial from './20261002_073156_initial'
import * as migration_20261002_200042_indies_wave_3_1 from './20261002_200042_indies_wave_3_1'

export const migrations = [
  {
    up: migration_20261002_073156_initial.up,
    down: migration_20261002_073156_initial.down,
    name: '20261002_073156_initial',
  },
  {
    up: migration_20261002_200042_indies_wave_3_1.up,
    down: migration_20261002_200042_indies_wave_3_1.down,
    name: '20261002_200042_indies_wave_3_1',
  },
]
