import * as migration_20261002_073156_initial from './20261002_073156_initial'
import * as migration_20261002_200042_indies_wave_3_1 from './20261002_200042_indies_wave_3_1'
import * as migration_20261005_033710_indies_9_4b from './20261005_033710_indies_9_4b'
import * as migration_20261006_053750_indies_6_6 from './20261006_053750_indies_6_6'
import * as migration_20261006_054525_indies_9_1 from './20261006_054525_indies_9_1'

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
  {
    up: migration_20261006_053750_indies_6_6.up,
    down: migration_20261006_053750_indies_6_6.down,
    name: '20261006_053750_indies_6_6',
  },
  {
    up: migration_20261006_054525_indies_9_1.up,
    down: migration_20261006_054525_indies_9_1.down,
    name: '20261006_054525_indies_9_1',
  },
]
