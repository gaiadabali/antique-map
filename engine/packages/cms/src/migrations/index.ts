import * as migration_20260929_171222_initial from './20260929_171222_initial'

export const migrations = [
  {
    up: migration_20260929_171222_initial.up,
    down: migration_20260929_171222_initial.down,
    name: '20260929_171222_initial',
  },
]
