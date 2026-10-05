import * as migration_20261002_073156_initial from './20261002_073156_initial'
import * as migration_20261002_200042_indies_wave_3_1 from './20261002_200042_indies_wave_3_1'
import * as migration_20261005_033710_indies_9_4b from './20261005_033710_indies_9_4b'

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
  {
    up: migration_20261005_033710_indies_9_4b.up,
    down: migration_20261005_033710_indies_9_4b.down,
    name: '20261005_033710_indies_9_4b',
  },
]
