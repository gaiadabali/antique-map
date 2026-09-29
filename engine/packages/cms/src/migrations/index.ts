import * as migration_20260929_182126_initial from './20260929_182126_initial'

export const migrations = [
  {
    up: migration_20260929_182126_initial.up,
    down: migration_20260929_182126_initial.down,
    name: '20260929_182126_initial',
  },
]
